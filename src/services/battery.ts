import { InControlService } from "../util/incontrol";
import { HomeKitService } from "./base";
import callbackify from "../util/callbackify";

export class HomeKitBatteryService extends HomeKitService {
  private lowBatteryThreshold: number;

  constructor(
    name: string,
    lowBatteryThreshold: number | undefined,
    log: Function,
    incontrol: InControlService,
    Service: any,
    Characteristic: any,
  ) {
    super(log, incontrol, Characteristic);

    this.lowBatteryThreshold = lowBatteryThreshold || 25;

    const batteryService = new Service.BatteryService(name, "vehicle");
    batteryService
      .getCharacteristic(Characteristic.BatteryLevel)
      .on("get", callbackify(this.getBatteryLevel));
    batteryService
      .getCharacteristic(Characteristic.ChargingState)
      .on("get", callbackify(this.getChargingState));
    batteryService
      .getCharacteristic(Characteristic.StatusLowBattery)
      .on("get", callbackify(this.getStatusLowBattery));
    this.service = batteryService;
  }

  getBatteryLevel = async (): Promise<number> => {
    this.log("Getting battery level");

    const vehicleStatus = await this.incontrol.getVehicleStatus();
    const chargeLevel = vehicleStatus.EV_STATE_OF_CHARGE;

    return chargeLevel;
  };

  getChargingState = async (): Promise<any> => {
    this.log("Getting charging state.");

    const vehicleStatus = await this.incontrol.getVehicleStatus();
    const chargingStatus = vehicleStatus.EV_CHARGING_STATUS;

    return chargingStatus === "CHARGING"
      ? this.Characteristic.ChargingState.CHARGING
      : this.Characteristic.ChargingState.NOT_CHARGING;
  };

  getStatusLowBattery = async (): Promise<boolean> => {
    this.log("Getting low battery status");

    const batteryLevel = await this.getBatteryLevel();

    return batteryLevel < this.lowBatteryThreshold;
  };
}
