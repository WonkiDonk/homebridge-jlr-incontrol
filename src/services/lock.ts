import { JaguarLandRoverRemoteApi } from "../util/remote";
import { HomeKitService } from "./base";
import callbackify from "../util/callbackify";
import { wait } from "../util/wait";

export class HomeKitLockService extends HomeKitService {
  constructor(
    name: string,
    log: Function,
    jlrRemoteService: JaguarLandRoverRemoteApi,
    Service: any,
    Characteristic: any,
  ) {
    super(log, jlrRemoteService, Characteristic);

    const lockService = new Service.LockMechanism(name, "vehicle");
    lockService
      .getCharacteristic(Characteristic.LockCurrentState)
      .on("get", callbackify(this.getLockCurrentState));
    lockService
      .getCharacteristic(Characteristic.LockTargetState)
      .on("get", callbackify(this.getLockTargetState))
      .on("set", callbackify(this.setLockTargetState));
    this.service = lockService;
  }

  getLockCurrentState = async () => {
    this.log("Getting current lock state");

    const vehicleStatus = await this.jlrRemoteApi.getVehicleStatus();
    const lockedState = vehicleStatus.DOOR_IS_ALL_DOORS_LOCKED;

    return lockedState === "TRUE"
      ? this.Characteristic.LockCurrentState.SECURED
      : this.Characteristic.LockCurrentState.UNSECURED;
  };

  getLockTargetState = async () => {
    this.log("Getting target lock state");

    const vehicleStatus = await this.jlrRemoteApi.getVehicleStatus();
    const lockedState = vehicleStatus.DOOR_IS_ALL_DOORS_LOCKED;

    return lockedState === "TRUE"
      ? this.Characteristic.LockTargetState.SECURED
      : this.Characteristic.LockTargetState.UNSECURED;
  };

  setLockTargetState = async state => {
    this.log("Setting target lock state", state);

    if (state === this.Characteristic.LockTargetState.SECURED) {
      await this.jlrRemoteApi.lockVehicle();
    } else {
      await this.jlrRemoteApi.unlockVehicle();
    }

    // We succeeded, so update the "current" state as well.
    // We need to update the current state "later" because Siri can't
    // handle receiving the change event inside the same "set target state"
    // response.
    await wait(1);

    if (state == this.Characteristic.LockTargetState.SECURED) {
      this.service.setCharacteristic(
        this.Characteristic.LockCurrentState,
        this.Characteristic.LockCurrentState.SECURED,
      );
    } else {
      this.service.setCharacteristic(
        this.Characteristic.LockCurrentState,
        this.Characteristic.LockCurrentState.UNSECURED,
      );
    }
  };
}
