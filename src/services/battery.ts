import callbackify from "../util/callbackify"
import { HAP } from "homebridge"
import { HomeKitService } from "./base"
import { JaguarLandRoverRemoteApi } from "../util/remote"

export class HomeKitBatteryService extends HomeKitService {
  private lowBatteryThreshold: number

  constructor(
    name: string,
    lowBatteryThreshold: number | undefined,
    log: Function,
    jlrRemoteApi: JaguarLandRoverRemoteApi,
    hap: HAP,
  ) {
    super(log, jlrRemoteApi, hap)

    this.lowBatteryThreshold = lowBatteryThreshold || 25

    const batteryService = new hap.Service.BatteryService(name, "vehicle")
    batteryService
      .getCharacteristic(hap.Characteristic.BatteryLevel)
      .on("get", callbackify(this.getBatteryLevel))
    batteryService
      .getCharacteristic(hap.Characteristic.ChargingState)
      .on("get", callbackify(this.getChargingState))
    batteryService
      .getCharacteristic(hap.Characteristic.StatusLowBattery)
      .on("get", callbackify(this.getStatusLowBattery))
    this.service = batteryService
  }

  private getBatteryLevel = async (): Promise<number> => {
    this.log("Getting battery level")

    const vehicleStatus = await this.jlrRemoteApi.getVehicleStatus()
    const chargeLevel = vehicleStatus.EV_STATE_OF_CHARGE

    return chargeLevel
  }

  private getChargingState = async (): Promise<any> => {
    this.log("Getting charging state.")

    const vehicleStatus = await this.jlrRemoteApi.getVehicleStatus()
    const chargingStatus = vehicleStatus.EV_CHARGING_STATUS

    return chargingStatus === "CHARGING"
      ? this.hap.Characteristic.ChargingState.CHARGING
      : this.hap.Characteristic.ChargingState.NOT_CHARGING
  }

  private getStatusLowBattery = async (): Promise<boolean> => {
    this.log("Getting low battery status")

    const batteryLevel = await this.getBatteryLevel()

    return batteryLevel < this.lowBatteryThreshold
  }
}
