import { InControlService } from "../util/incontrol";
import { HomeKitService } from "./base";
import callbackify from "../util/callbackify";
import { wait } from "../util/wait";

export class HomeKitChargerService extends HomeKitService {
  constructor(
    name: string,
    log: Function,
    incontrol: InControlService,
    Service: any,
    Characteristic: any,
  ) {
    super(log, incontrol, Characteristic);

    const chargingService = new Service.Outlet(`${name} Charger`, "vehicle");
    chargingService
      .getCharacteristic(Characteristic.On)
      .on("get", callbackify(this.getChargerOutletOnOff))
      .on("set", callbackify(this.setChargerOutletOnOff));
    chargingService
      .getCharacteristic(Characteristic.OutletInUse)
      .on("get", callbackify(this.getChargerOutletInUse));
    this.service = chargingService;
  }

  getChargerOutletOnOff = async () => {
    this.log("Getting charger outlet on/off");

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
      this.service.setCharacteristic(this.Characteristic.On, false);
    } else if (state) {
      this.incontrol.startCharging();
    } else {
      this.incontrol.stopCharging();
    }
  };

  getChargerOutletInUse = async (): Promise<boolean> => {
    this.log("Getting charger outlet in use [cable connected]");

    const vehicleStatus = await this.incontrol.getVehicleStatus();
    const chargingMethod = vehicleStatus.EV_CHARGING_METHOD;

    return chargingMethod === "WIRED";
  };
}
