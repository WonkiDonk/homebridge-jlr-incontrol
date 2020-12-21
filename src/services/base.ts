import { JaguarLandRoverRemoteApi } from "../util/remote";

export abstract class HomeKitService {
  protected readonly Characteristic: any;
  protected readonly jlrRemoteApi: JaguarLandRoverRemoteApi;
  protected readonly log: Function;
  protected service: any;

  constructor(log: Function, jlrRemoteApi: JaguarLandRoverRemoteApi, Characteristic: any) {
    this.log = log;
    this.jlrRemoteApi = jlrRemoteApi;
    this.Characteristic = Characteristic;
  }

  getService = () => this.service;
}
