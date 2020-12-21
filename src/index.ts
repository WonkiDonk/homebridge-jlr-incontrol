require("@babel/polyfill");
import { API, HAP } from "homebridge"
import { JaguarLandRoverRemoteApi } from "./util/remote"
import { myCredentials } from "./credentials.private"
import { HomeKitBatteryService } from "./services/battery"
import { HomeKitChargerService } from "./services/charger"
import { HomeKitLockService } from "./services/lock"
import { HomeKitPreconditioningService } from "./services/preconditioning"

let hap: HAP;

export default function (homebridge: API) {
  hap = homebridge.hap

  homebridge.registerAccessory(
    "homebridge-jlr-incontrol",
    "Jaguar Land Rover InControl",
    JaguarLandRoverAccessory
  )
}

class JaguarLandRoverAccessory {
  private readonly services: any[]
  private readonly jlrRemoteApi: JaguarLandRoverRemoteApi

  constructor(log: any, config: any) {
    const name = config["name"]
    const disableEV = config["disableEV"] || false

    this.jlrRemoteApi = new JaguarLandRoverRemoteApi(log, myCredentials)
    this.services = [
      new HomeKitLockService(name, log, this.jlrRemoteApi, hap.Service, hap.Characteristic).getService(),
      new HomeKitPreconditioningService(name, 21, 18, log, this.jlrRemoteApi, hap.Service, hap.Characteristic).getService(),
      ...(disableEV ? [] : [
        new HomeKitBatteryService(name, config["lowBatteryThreshold"], log, this.jlrRemoteApi, hap.Service, hap.Characteristic),
        new HomeKitChargerService(name, log, this.jlrRemoteApi, hap.Service, hap.Characteristic)
      ])
    ]
  }

  getServices = () => this.services
}
