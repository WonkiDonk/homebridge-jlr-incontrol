import {
  VehicleStatusResponse,
  VehicleStatus,
  VehicleAttributes,
} from "./types"
import { Credentials } from "./credentials"
import { EmptyVehicleStatus } from "./emptyVehicleStatus"
import { lock } from "./mutex"

const rpn = require("request-promise-native")

type Authentication = {
  accessToken: string
  authorizationToken: string
  expiresIn: number
  refreshToken: string
  tokenType: string
  isDeviceRegistered: boolean
  userId: string
  validUntil: Date
}

type LockUnlockOperation = {
  name: string
  tokenType: string
}

export class JaguarLandRoverRemoteApi {
  private auth: Authentication | undefined
  private UnlockVehicleOperation: LockUnlockOperation = {
    name: "unlock",
    tokenType: "RDU",
  }
  private LockVehicleOperation: LockUnlockOperation = {
    name: "lock",
    tokenType: "RDL",
  }
  private static readonly vehicleInformationAccepts = {
    status: "application/vnd.ngtp.org.if9.healthstatus-v2+json",
    attributes: "application/vnd.ngtp.org.VehicleAttributes-v3+json",
  }

  constructor(
    private log: any,
    private credentials: Credentials
  ) { }

  private sendRequest = async (
    method: string,
    endpoint: string,
    headers: any,
    json: any = {},
    resolveWithFullResponse: boolean = false,
  ): Promise<any> => {
    try {
      const request = {
        method: method,
        uri: endpoint,
        headers: headers,
        json: json,
        resolveWithFullResponse: resolveWithFullResponse,
      }
      return await rpn(request)
    } catch (error) {
      if (typeof error === "string") {
        throw new Error(error)
      }

      throw error
    }
  }

  private invalidateSessionIfExpired = (): void => {
    if (this.auth) {
      this.log(
        "Current session valid until",
        this.auth.validUntil.toUTCString(),
      )

      if (this.auth.validUntil < new Date()) {
        this.log("Current session expired")
        this.auth = undefined
      }
    } else {
      this.log("No existing session")
    }
  }

  private getSession = async (): Promise<Authentication> => {
    // Use a mutex to prevent multiple logins happening in parallel.
    const unlock = await lock("getSession", 20000)

    try {
      this.invalidateSessionIfExpired()

      if (this.auth) {
        this.log("Getting active session")
        return this.auth
      }

      this.log("Starting new session")

      this.auth = await this.authenticate()
      this.auth.isDeviceRegistered = await this.registerDevice()
      this.auth.userId = await this.getUserId()

      return this.auth
    } finally {
      unlock()
    }
  }

  private authenticate = async (): Promise<Authentication> => {
    const { username, password, deviceId } = this.credentials
    const { auth, log } = this

    // Return cached value if we have one.
    if (auth) return auth

    log("Authenticating with InControl API using credentials")

    const headers = {
      "Content-Type": "application/json",
      Authorization: "Basic YXM6YXNwYXNz ",
      "X-Device-Id": deviceId,
      Connection: "close",
    }
    const json = {
      grant_type: "password",
      password: password,
      username: username,
    }

    const result = await this.sendRequest(
      "POST",
      "https://ifas.prod-row.jlrmotor.com/ifas/jlr/tokens",
      headers,
      json,
    )
    const {
      access_token,
      authorization_token,
      refresh_token,
      expires_in,
      token_type,
    } = result

    log("Got an authentication token.")

    const validUntil = new Date()
    validUntil.setSeconds(validUntil.getUTCSeconds() + Number(expires_in))

    log("Authentication token valid until", validUntil.toUTCString())

    return {
      accessToken: access_token,
      authorizationToken: authorization_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      tokenType: token_type,
      isDeviceRegistered: false,
      userId: "",
      validUntil: validUntil,
    }
  }

  private registerDevice = async (): Promise<boolean> => {
    const { username, deviceId } = this.credentials
    const { auth } = this

    // Return cached value if we have one.
    if (auth && auth.isDeviceRegistered) return auth.isDeviceRegistered

    if (!auth) {
      this.log("Could not register device as not authenticated.")
      return false
    }

    this.log("Registering device")
    const headers = {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
      Connection: "close",
    }
    const json = {
      access_token: auth.accessToken,
      authorization_token: auth.authorizationToken,
      expires_in: auth.expiresIn,
      deviceID: deviceId,
    }

    const result = await this.sendRequest(
      "POST",
      `https://ifop.prod-row.jlrmotor.com/ifop/jlr/users/${username}/clients`,
      headers,
      json,
      true,
    )

    const isDeviceRegistered = result.statusCode === 204
    this.log("Device registration result", isDeviceRegistered)

    return isDeviceRegistered
  }

  private getUserId = async (): Promise<string> => {
    const { username, deviceId } = this.credentials
    const { auth } = this

    // Return cached value if we have one.
    if (auth && auth.userId) return auth.userId

    if (!auth) {
      this.log("Could not get user identifier as not authenticated.")
      return ""
    }

    this.log("Getting user id")
    const headers = {
      Accept: "application/vnd.wirelesscar.ngtp.if9.User-v3+json",
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
      Connection: "close",
    }

    const result = await this.sendRequest(
      "GET",
      `https://if9.prod-row.jlrmotor.com/if9/jlr/users?loginName=${username}`,
      headers,
    )

    const userId = result.userId
    this.log("Log in user id")

    return userId
  }

  private getCommandToken = async (
    tokenType: string,
    pin: string,
  ): Promise<string> => {
    const { vin, deviceId } = this.credentials
    const auth = await this.getSession()

    this.log("Getting command token", tokenType)

    const headers = {
      "Content-Type":
        "application/vnd.wirelesscar.ngtp.if9.AuthenticateRequest-v2+json; charset=utf-8",
      Authorization: `Bearer ${auth.accessToken}`,
      "X-Device-Id": deviceId,
    }
    const json = {
      serviceName: tokenType,
      pin: pin,
    }

    var response = await this.sendRequest(
      "POST",
      `https://if9.prod-row.jlrmotor.com/if9/jlr/vehicles/${vin}/users/${auth.userId}/authenticate`,
      headers,
      json,
    )

    return response.token
  }

  private lockUnlockVehicle = async (
    operation: LockUnlockOperation,
  ): Promise<any> => {
    const { pin } = this.credentials
    const token = await this.getCommandToken(operation.tokenType, pin)
    const { vin, deviceId } = this.credentials
    const { auth } = this

    if (!auth) {
      this.log("Could not lock or unlock vehicle as not authenticated.")
      return false
    }

    const headers = {
      Accept: "*/*",
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type":
        "application/vnd.wirelesscar.ngtp.if9.StartServiceConfiguration-v2+json",
      "X-Device-Id": deviceId,
    }

    const json = { token: token }

    await this.sendRequest(
      "POST",
      `https://if9.prod-row.jlrmotor.com/if9/jlr/vehicles/${vin}/${operation.name}`,
      headers,
      json,
    )
  }

  private sendVehicleCommand = async (
    service: string,
    tokenType: string,
    serviceParameters: any[],
  ): Promise<any> => {
    const pin = this.getLastFourOfVin()
    const token = await this.getCommandToken(tokenType, pin)
    const { vin, deviceId } = this.credentials
    const { auth } = this

    if (!auth) {
      this.log("Could not send vehicle command as not authenticated.")
      return false
    }

    const headers = {
      Accept: "application/vnd.wirelesscar.ngtp.if9.ServiceStatus-v5+json",
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type":
        "application/vnd.wirelesscar.ngtp.if9.PhevService-v1+json; charset=utf",
      "X-Device-Id": deviceId,
    }

    const json = { token: token, serviceParameters: serviceParameters }

    this.log("Sending preconditioning command", serviceParameters)

    await this.sendRequest(
      "POST",
      `https://if9.prod-row.jlrmotor.com/if9/jlr/vehicles/${vin}/${service}`,
      headers,
      json,
    )
  }

  getLastFourOfVin = (): string => {
    const { vin } = this.credentials
    return vin.slice(vin.length - 4)
  }

  private getVehicleInformation = async (name: string): Promise<any> => {
    const { vin, deviceId } = this.credentials
    const auth = await this.getSession()

    this.log("Getting vehicle")

    const headers = {
      Authorization: `Bearer ${auth.accessToken}`,
      Accept: JaguarLandRoverRemoteApi.vehicleInformationAccepts[name],
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
    }

    return await this.sendRequest(
      "GET",
      `https://if9.prod-row.jlrmotor.com/if9/jlr/vehicles/${vin}/${name}`,
      headers,
    )
  }

  getVehicleAttributes = async (): Promise<VehicleAttributes> => {
    return await this.getVehicleInformation("attributes")
  }

  getVehicleStatus = async (): Promise<VehicleStatus> => {
    const response: VehicleStatusResponse = await this.getVehicleInformation(
      "status",
    )

    let vehicleStatus: VehicleStatus = EmptyVehicleStatus

    response.vehicleStatus.map(kvp => (vehicleStatus[kvp.key] = kvp.value))

    return vehicleStatus
  }

  lockVehicle = async (): Promise<any> => {
    return this.lockUnlockVehicle(this.LockVehicleOperation)
  }

  unlockVehicle = async (): Promise<any> => {
    return this.lockUnlockVehicle(this.UnlockVehicleOperation)
  }

  startPreconditioning = async (targetTemperature: number) => {
    const serviceParameters: any[] = [
      { key: "PRECONDITIONING", value: "START" },
      { key: "TARGET_TEMPERATURE_CELSIUS", value: targetTemperature * 10 },
    ]
    return this.sendVehicleCommand("preconditioning", "ECC", serviceParameters)
  }

  stopPreconditioning = async () => {
    const serviceParameters: any[] = [
      { key: "PRECONDITIONING", value: "STOP" },
    ]
    return this.sendVehicleCommand("preconditioning", "ECC", serviceParameters)
  }

  startCharging = async () => {
    const serviceParameters: any[] = [
      { key: "CHARGE_NOW_SETTING", value: "FORCE_ON" },
    ]
    return this.sendVehicleCommand("chargeProfile", "CP", serviceParameters)
  }

  stopCharging = async () => {
    const serviceParameters: any[] = [
      { key: "CHARGE_NOW_SETTING", value: "FORCE_OFF" },
    ]
    return this.sendVehicleCommand("chargeProfile", "CP", serviceParameters)
  }
}
