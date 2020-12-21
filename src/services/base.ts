import { HAP } from "homebridge"
import { JaguarLandRoverRemoteApi } from "../util/remote"

export abstract class HomeKitService {
  protected service: any

  constructor(protected log: Function, protected jlrRemoteApi: JaguarLandRoverRemoteApi, protected hap: HAP) { }

  getService = () => this.service
}
