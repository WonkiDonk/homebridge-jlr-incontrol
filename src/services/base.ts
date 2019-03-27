import { InControlService } from "../util/incontrol";

export abstract class HomeKitService {
  protected readonly Characteristic: any;
  protected readonly incontrol: InControlService;
  protected readonly log: Function;
  protected service: any;

  constructor(log: Function, incontrol: InControlService, Characteristic: any) {
    this.log = log;
    this.incontrol = incontrol;
    this.Characteristic = Characteristic;
  }

  getService = () => this.service;
}
