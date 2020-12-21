import callbackify from "../util/callbackify"
import { JaguarLandRoverRemoteApi } from "../util/remote"
import { HAP } from "homebridge"
import { HomeKitService } from "./base"
import { wait } from "../util/wait"

export class HomeKitLockService extends HomeKitService {
  constructor(
    name: string,
    log: Function,
    jlrRemoteService: JaguarLandRoverRemoteApi,
    hap: HAP
  ) {
    super(log, jlrRemoteService, hap)

    const lockService = new hap.Service.LockMechanism(name, "vehicle")
    lockService
      .getCharacteristic(hap.Characteristic.LockCurrentState)
      .on("get", callbackify(this.getLockCurrentState))
    lockService
      .getCharacteristic(hap.Characteristic.LockTargetState)
      .on("get", callbackify(this.getLockTargetState))
      .on("set", callbackify(this.setLockTargetState))
    this.service = lockService
  }

  getLockCurrentState = async () => {
    this.log("Getting current lock state")

    const vehicleStatus = await this.jlrRemoteApi.getVehicleStatus()
    const lockedState = vehicleStatus.DOOR_IS_ALL_DOORS_LOCKED

    return lockedState === "TRUE"
      ? this.hap.Characteristic.LockCurrentState.SECURED
      : this.hap.Characteristic.LockCurrentState.UNSECURED
  }

  getLockTargetState = async () => {
    this.log("Getting target lock state")

    const vehicleStatus = await this.jlrRemoteApi.getVehicleStatus()
    const lockedState = vehicleStatus.DOOR_IS_ALL_DOORS_LOCKED

    return lockedState === "TRUE"
      ? this.hap.Characteristic.LockTargetState.SECURED
      : this.hap.Characteristic.LockTargetState.UNSECURED
  }

  setLockTargetState = async state => {
    this.log("Setting target lock state", state)

    if (state === this.hap.Characteristic.LockTargetState.SECURED) {
      await this.jlrRemoteApi.lockVehicle()
    } else {
      await this.jlrRemoteApi.unlockVehicle()
    }

    // We succeeded, so update the "current" state as well.
    // We need to update the current state "later" because Siri can't
    // handle receiving the change event inside the same "set target state"
    // response.
    await wait(1)

    if (state == this.hap.Characteristic.LockTargetState.SECURED) {
      this.service.setCharacteristic(
        this.hap.Characteristic.LockCurrentState,
        this.hap.Characteristic.LockCurrentState.SECURED,
      )
    } else {
      this.service.setCharacteristic(
        this.hap.Characteristic.LockCurrentState,
        this.hap.Characteristic.LockCurrentState.UNSECURED,
      )
    }
  }
}
