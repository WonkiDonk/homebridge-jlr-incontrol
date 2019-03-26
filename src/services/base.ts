import { InControlService } from "../util/incontrol";

export abstract class HomeKitService {
  protected log: Function;
  protected incontrol: InControlService;
  protected service: any;
  protected Characteristic: any;

  constructor(log: Function, incontrol: InControlService, Characteristic: any) {
    this.log = log;
    this.incontrol = incontrol;
    this.Characteristic = Characteristic;
  }

  getService = () => this.service;
}
