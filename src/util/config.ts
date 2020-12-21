import { Credentials } from './credentials'

export type Config = Credentials & {
    accessory: string,
    name: string,
    lowBatteryThreshold: number,
    targetTemperature: number,
    disableEV: boolean
}
