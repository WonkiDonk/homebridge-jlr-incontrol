require("@babel/polyfill");
import { InControlService } from "./util/incontrol";
import { HomeKitService } from "./services/base";
import { HomeKitBatteryService } from "./services/battery";
import { HomeKitLockService } from "./services/lock";
import { HomeKitPreconditioningService } from "./services/preconditioning";

let Service: any, Characteristic: any;

export default function(homebridge: any) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory(
    "homebridge-jlr-incontrol",
    "Jaguar Land Rover InControl",
    JaguarLandRoverAccessory,
  );
}

class JaguarLandRoverAccessory {
  homeKitServices: HomeKitService[];

  constructor(log: any, config: any) {
    const name = config["name"];
    const incontrol = new InControlService(
      log,
      config["username"],
      config["password"],
      config["deviceId"],
      config["vin"],
      config["pin"],
    );

    this.homeKitServices = [
      new HomeKitBatteryService(
        name,
        config["lowBatteryThreshold"],
        log,
        incontrol,
        Service,
        Characteristic,
      ),
      new HomeKitLockService(name, log, incontrol, Service, Characteristic),
      new HomeKitPreconditioningService(
        name,
        config["targetTemperature"],
        config["coolingThresholdTemperature"],
        log,
        incontrol,
        Service,
        Characteristic,
      ),
    ];
  }

  getServices = () =>
    this.homeKitServices.map(homeKitService => homeKitService.getService());
}
