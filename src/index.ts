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
    const chargingService = new Service.Outlet(
      `${this.name} Charger`,
      "vehicle",
    );
    chargingService
      .getCharacteristic(Characteristic.On)
      .on("get", callbackify(this.getChargerOutletOnOff))
      .on("set", callbackify(this.setChargerOutletOnOff));
    chargingService
      .getCharacteristic(Characteristic.OutletInUse)
      .on("get", callbackify(this.getChargerOutletInUse));
    this.chargingService = chargingService;
  }

  getServices = () =>
    this.homeKitServices.map(homeKitService => homeKitService.getService());

  //
  // Charger
  //

  getChargerOutletOnOff = async () => {
    const vehicleStatus = await this.incontrol.getVehicleStatus();
    const chargingStatus = vehicleStatus.EV_CHARGING_STATUS;

    return chargingStatus === "CHARGING";
  };

  setChargerOutletOnOff = async state => {
    const { log } = this;
    const chargerConnected = await this.getChargerOutletInUse();

    log("Turning charger outlet", state ? "on" : "off");
    if (state && !chargerConnected) {
      log("Charging cable is not connected. Turning off.");
      await wait(1);
      this.chargingService.setCharacteristic(Characteristic.On, false);
    } else if (state) {
      this.incontrol.startCharging();
    } else {
      this.incontrol.stopCharging();
    }
  };

  getChargerOutletInUse = async () => {
    const vehicleStatus = await this.incontrol.getVehicleStatus();
    const chargingMethod = vehicleStatus.EV_CHARGING_METHOD;

    return chargingMethod === "WIRED";
  };
}
