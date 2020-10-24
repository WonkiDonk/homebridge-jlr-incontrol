import { InControlService } from "../util/incontrol";
import { HomeKitService } from "./base";
import callbackify from "../util/callbackify";
import { wait } from "../util/wait";

export class HomeKitPreconditioningService extends HomeKitService {
  private minimumTemperature = 15.5;
  private maximumTemperature = 28.5;
  private targetTemperature: number;
  private coolingThresholdTemperature: number;

  constructor(
    name: string,
    targetTemperature: number | undefined,
    coolingThresholdTemperature: number | undefined,
    log: Function,
    incontrol: InControlService,
    Service: any,
    Characteristic: any,
  ) {
    super(log, incontrol, Characteristic);

    this.targetTemperature = targetTemperature || 22;
    this.coolingThresholdTemperature = coolingThresholdTemperature || 20;

    const preconditioningService = new Service.Thermostat(
      `${name} Preconditioning`,
      "vehicle",
    );
    preconditioningService
      .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .on("get", callbackify(this.getCurrentHeatingCoolingState));
    preconditioningService
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on("get", callbackify(this.getTargetHeatingCoolingState))
      .on("set", callbackify(this.setTargetHeatingCoolingState));
    preconditioningService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on("get", callbackify(this.getCurrentTemperature));
    preconditioningService
      .getCharacteristic(Characteristic.TargetTemperature)
      .on("get", callbackify(this.getTargetTemperature))
      .on("set", callbackify(this.setTargetTemperature));
    preconditioningService
      .getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .on("get", callbackify(this.getTemperatureDisplayUnits));
    this.service = preconditioningService;
  }

  getCurrentHeatingCoolingState = async () => {
    this.log("Getting current heating/cooling state");

    const vehicleStatus = await this.incontrol.getVehicleStatus();
    const climateStatus = vehicleStatus.CLIMATE_STATUS_OPERATING_STATUS;

    const climateOnState =
      this.targetTemperature < this.coolingThresholdTemperature
        ? this.Characteristic.CurrentHeatingCoolingState.COOL
        : this.Characteristic.CurrentHeatingCoolingState.HEAT;

    return climateStatus === "HEATING"
      ? climateOnState
      : this.Characteristic.CurrentHeatingCoolingState.OFF;
  };

  getTargetHeatingCoolingState = async () => {
    this.log("Getting target heating/cooling state");

    const vehicleStatus = await this.incontrol.getVehicleStatus();
    const climateStatus = vehicleStatus.CLIMATE_STATUS_OPERATING_STATUS;

    const climateOnState =
      this.targetTemperature < this.coolingThresholdTemperature
        ? this.Characteristic.TargetHeatingCoolingState.COOL
        : this.Characteristic.TargetHeatingCoolingState.HEAT;

    return climateStatus === "HEATING"
      ? climateOnState
      : this.Characteristic.TargetHeatingCoolingState.OFF;
  };

  setTargetHeatingCoolingState = async state => {
    this.log("Setting heating cooling state to", state);

    if (state != this.Characteristic.CurrentHeatingCoolingState.OFF) {
      await this.incontrol.startPreconditioning(this.targetTemperature);
    } else {
      await this.incontrol.stopPreconditioning();
    }

    // We succeeded, so update the "current" state as well.
    // We need to update the current state "later" because Siri can't
    // handle receiving the change event inside the same "set target state"
    // response.
    await wait(1);

    return state;
  };

  getCurrentTemperature = async () => {
    this.log("Getting current temperature");

    return this.targetTemperature;
  };

  getTargetTemperature = async () => {
    this.log("Getting target temperature");

    return this.targetTemperature;
  };

  setTargetTemperature = async state => {
    this.log("Setting target temperature", state);

    const { minimumTemperature, maximumTemperature } = this;

    if (state < minimumTemperature) state = minimumTemperature;
    else if (state > maximumTemperature) state = maximumTemperature;

    this.targetTemperature = state;

    // We succeeded, so update the "current" state as well.
    // We need to update the current state "later" because Siri can't
    // handle receiving the change event inside the same "set target state"
    // response.
    await wait(1);

    // if we're currently preconditioning, then send the update to the car
    if (
      (await this.getCurrentHeatingCoolingState()) !==
      this.Characteristic.CurrentHeatingCoolingState.OFF
    )
      await this.setTargetHeatingCoolingState(
        this.Characteristic.TargetHeatingCoolingState.AUTO,
      );

    return state;
  };

  getTemperatureDisplayUnits = async () => {
    this.log("Getting temperature display units");

    return this.Characteristic.TemperatureDisplayUnits.CELSIUS;
  };
}
