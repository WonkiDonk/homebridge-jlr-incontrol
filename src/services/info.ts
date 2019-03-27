import { InControlService } from "../util/incontrol";
import { HomeKitService } from "./base";
import { VehicleAttributes } from "../util/types";
import callbackify from "../util/callbackify";

export class HomeKitInformationService extends HomeKitService {
  constructor(
    name: string,
    log: Function,
    incontrol: InControlService,
    Service: any,
    Characteristic: any,
  ) {
    super(log, incontrol, Characteristic);

    const informationService = new Service.AccessoryInformation();
    this.service = informationService;
  }

  getInformation = async () => {
    const { log, service, Characteristic } = this;
    log("Getting vehicle info");

    const vehicleAttributes = await this.incontrol
      .getVehicleAttributes()
      .then();

    service.setCharacteristic(
      Characteristic.Manufacturer,
      vehicleAttributes.vehicleBrand,
    );
    service.setCharacteristic(
      Characteristic.Model,
      vehicleAttributes.vehicleType,
    );
    service.setCharacteristic(Characteristic.Name, vehicleAttributes.nickname);
    service.setCharacteristic(
      Characteristic.SerialNumber,
      vehicleAttributes.registrationNumber,
    );
    service.setCharacteristic(Characteristic.FirmwareRevision, "1.0");
    service.setCharacteristic(
      Characteristic.HardwareRevision,
      vehicleAttributes.vehicleTypeCode,
    );
  };
}
