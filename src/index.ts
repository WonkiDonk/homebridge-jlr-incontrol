require("@babel/polyfill")
import { AccessoryConfig, API, HAP, HapCharacteristic } from "homebridge"
import { Config } from "./util/config"
import { JaguarLandRoverRemoteApi } from "./util/remote"
import { HomeKitBatteryService } from "./services/battery"
import { HomeKitChargerService } from "./services/charger"
import { HomeKitLockService } from "./services/lock"
import { HomeKitPreconditioningService } from "./services/preconditioning"
import {Service} from "homebridge"
import { Credentials } from "./util/credentials"

let hap: HAP

export default function (homebridge: API) {
  hap = homebridge.hap

  homebridge.registerAccessory(
    "homebridge-jlr-incontrol",
    "Jaguar Land Rover InControl",
    JaguarLandRoverAccessory
  )
}

class JaguarLandRoverAccessory {
  private readonly services: Service[]
  private readonly jlrRemoteApi: JaguarLandRoverRemoteApi

  constructor(log: any, config: AccessoryConfig) {
    const configuration = (config as unknown) as Config
    const name = configuration.name

    this.jlrRemoteApi = new JaguarLandRoverRemoteApi(log, configuration)
    this.services = [
      new HomeKitLockService(name, log, this.jlrRemoteApi, hap).getService(),
      new HomeKitPreconditioningService(name, 21, 18, log, this.jlrRemoteApi, hap).getService(),
      ...(configuration.disableEV ? [] : [
        new HomeKitBatteryService(name, config["lowBatteryThreshold"], log, this.jlrRemoteApi, hap).getService(),
        new HomeKitChargerService(name, log, this.jlrRemoteApi, hap).getService()
      ])
    ]
  }

  getServices = () => this.services
}
