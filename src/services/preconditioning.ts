import callbackify from "../util/callbackify"
import { HomeKitService } from "./base"
import { HAP } from "homebridge"
import { JaguarLandRoverRemoteApi } from "../util/remote"
import { wait } from "../util/wait"

export class HomeKitPreconditioningService extends HomeKitService {
  private minimumTemperature = 15.5
  private maximumTemperature = 28.5
  private targetTemperature: number
  private coolingThresholdTemperature: number

  constructor(
    name: string,
    targetTemperature: number | undefined,
    coolingThresholdTemperature: number | undefined,
    log: Function,
    jlrRemoteApi: JaguarLandRoverRemoteApi,
    hap: HAP,
  ) {
    super(log, jlrRemoteApi, hap)

    this.targetTemperature = targetTemperature || 22
    this.coolingThresholdTemperature = coolingThresholdTemperature || 20

    const preconditioningService = new hap.Service.Thermostat(
      `${name} Preconditioning`,
      "vehicle",
    )
    preconditioningService
      .getCharacteristic(hap.Characteristic.CurrentHeatingCoolingState)
      .on("get", callbackify(this.getCurrentHeatingCoolingState))
    preconditioningService
      .getCharacteristic(hap.Characteristic.TargetHeatingCoolingState)
      .on("get", callbackify(this.getTargetHeatingCoolingState))
      .on("set", callbackify(this.setTargetHeatingCoolingState))
    preconditioningService
      .getCharacteristic(hap.Characteristic.CurrentTemperature)
      .on("get", callbackify(this.getCurrentTemperature))
    preconditioningService
      .getCharacteristic(hap.Characteristic.TargetTemperature)
      .on("get", callbackify(this.getTargetTemperature))
      .on("set", callbackify(this.setTargetTemperature))
    preconditioningService
      .getCharacteristic(hap.Characteristic.TemperatureDisplayUnits)
      .on("get", callbackify(this.getTemperatureDisplayUnits))
    this.service = preconditioningService
  }

  getCurrentHeatingCoolingState = async () => {
    this.log("Getting current heating/cooling state")

    const vehicleStatus = await this.jlrRemoteApi.getVehicleStatus()
    const climateStatus = vehicleStatus.CLIMATE_STATUS_OPERATING_STATUS

    const climateOnState =
      this.targetTemperature < this.coolingThresholdTemperature
        ? this.hap.Characteristic.CurrentHeatingCoolingState.COOL
        : this.hap.Characteristic.CurrentHeatingCoolingState.HEAT

    return climateStatus === "HEATING"
      ? climateOnState
      : this.hap.Characteristic.CurrentHeatingCoolingState.OFF
  }

  getTargetHeatingCoolingState = async () => {
    this.log("Getting target heating/cooling state")

    const vehicleStatus = await this.jlrRemoteApi.getVehicleStatus()
    const climateStatus = vehicleStatus.CLIMATE_STATUS_OPERATING_STATUS

    const climateOnState =
      this.targetTemperature < this.coolingThresholdTemperature
        ? this.hap.Characteristic.TargetHeatingCoolingState.COOL
        : this.hap.Characteristic.TargetHeatingCoolingState.HEAT

    return climateStatus === "HEATING"
      ? climateOnState
      : this.hap.Characteristic.TargetHeatingCoolingState.OFF
  }

  setTargetHeatingCoolingState = async state => {
    this.log("Setting heating cooling state to", state)

    if (state === this.hap.Characteristic.TargetHeatingCoolingState.OFF) {
      await this.turnPreconditioningOff()
    } else {
      await this.turnPreconditioningOn()
    }
  }

  getCurrentTemperature = async () => {
    this.log("Getting current temperature")

    return this.targetTemperature
  }

  getTargetTemperature = async () => {
    this.log("Getting target temperature")

    return this.targetTemperature
  }

  setTargetTemperature = async state => {
    this.log("Setting target temperature", state)

    const { minimumTemperature, maximumTemperature } = this

    if (state < minimumTemperature) state = minimumTemperature
    else if (state > maximumTemperature) state = maximumTemperature

    this.targetTemperature = state

    // We succeeded, so update the "current" state as well.
    // We need to update the current state "later" because Siri can't
    // handle receiving the change event inside the same "set target state"
    // response.
    await wait(1)

    // if we're currently preconditioning, then send the update to the car
    if (
      (await this.getCurrentHeatingCoolingState()) !==
      this.hap.Characteristic.CurrentHeatingCoolingState.OFF
    )
      await this.setTargetHeatingCoolingState(
        this.hap.Characteristic.TargetHeatingCoolingState.AUTO,
      )

    return state
  }

  getTemperatureDisplayUnits = async () => {
    this.log("Getting temperature display units")

    return this.hap.Characteristic.TemperatureDisplayUnits.CELSIUS
  }

  private turnPreconditioningOn = async () => {
    this.log("Starting preconditioning")

    // We succeeded, so update the "current" state as well.
    // We need to update the current state "later" because Siri can't
    // handle receiving the change event inside the same "set target state"
    // response.
    await wait(1)

    const climateOnState =
      this.targetTemperature < this.coolingThresholdTemperature
        ? this.hap.Characteristic.CurrentHeatingCoolingState.COOL
        : this.hap.Characteristic.CurrentHeatingCoolingState.HEAT

    this.log("Setting CurrentHeatingCoolingState to", climateOnState)
    this.service.setCharacteristic(
      this.hap.Characteristic.CurrentHeatingCoolingState,
      climateOnState,
    )

    await this.jlrRemoteApi.startPreconditioning(this.targetTemperature)
  }

  private turnPreconditioningOff = async () => {
    this.log("Stopping preconditioning")

    // We succeeded, so update the "current" state as well.
    // We need to update the current state "later" because Siri can't
    // handle receiving the change event inside the same "set target state"
    // response.
    await wait(1)

    this.log("Setting CurrentHeatingCoolingState to", this.hap.Characteristic.CurrentHeatingCoolingState.OFF)
    this.service.setCharacteristic(
      this.hap.Characteristic.CurrentHeatingCoolingState,
      this.hap.Characteristic.CurrentHeatingCoolingState.OFF,
    )

    await this.jlrRemoteApi.stopPreconditioning()
  }
}
