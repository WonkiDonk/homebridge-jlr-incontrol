import callbackify from "../util/callbackify"
import { JaguarLandRoverRemoteApi } from "../util/remote"
import { HAP } from "homebridge"
import { HomeKitService } from "./base"
import { wait } from "../util/wait"

export class HomeKitChargerService extends HomeKitService {
  constructor(
    name: string,
    log: Function,
    jlrRemoteApi: JaguarLandRoverRemoteApi,
    hap: HAP
  ) {
    super(log, jlrRemoteApi, hap)

    const chargingService = new hap.Service.Outlet(`${name} Charger`, "vehicle")

    chargingService
      .getCharacteristic(hap.Characteristic.On)
      .on("get", callbackify(this.getChargerOutletOnOff))
      .on("set", callbackify(this.setChargerOutletOnOff))
    chargingService
      .getCharacteristic(hap.Characteristic.OutletInUse)
      .on("get", callbackify(this.getChargerOutletInUse))

    this.service = chargingService
  }

  getChargerOutletOnOff = async () => {
    this.log("Getting charger outlet on/off")

    const vehicleStatus = await this.jlrRemoteApi.getVehicleStatus()
    const chargingStatus = vehicleStatus.EV_CHARGING_STATUS

    return chargingStatus === "CHARGING"
  }

  setChargerOutletOnOff = async state => {
    const { log } = this
    const chargerConnected = await this.getChargerOutletInUse()

    log("Turning charger outlet", state ? "on" : "off")
    if (state && !chargerConnected) {
      log("Charging cable is not connected. Turning off.")
      await wait(1)
      this.service.setCharacteristic(this.hap.Characteristic.On, false)
    } else if (state) {
      this.jlrRemoteApi.startCharging()
    } else {
      this.jlrRemoteApi.stopCharging()
    }
  }

  getChargerOutletInUse = async (): Promise<boolean> => {
    this.log("Getting charger outlet in use [cable connected]")

    const vehicleStatus = await this.jlrRemoteApi.getVehicleStatus()
    const chargingMethod = vehicleStatus.EV_CHARGING_METHOD

    return chargingMethod === "WIRED"
  }
}
