# homebridge-jlr-incontrol

Jaguar Land Rover InControl plug in for [Homebridge](https://homebridge.io/).

Example config.json:

    {
      "accessories": [
        {
          "accessory": "Jaguar Land Rover InControl",
          "name": "I-PACE",
          "vin": "1AAAAA111AA111111",
          "username": "foo@bar.uk",
          "password": "foobar",
          "pin": 1234,
          "deviceId": "UUID",
          "lowBatteryThreshold": 25,
          "targetTemperature": 21
        }
      ]
    }

- `deviceId` needs to be a unique device identifier to identify your Homebridge.
- `lowBatteryThresold` defines the battery level below which the battery is considered to be low.
  Defaults to 25% if the value is not specified.
- `targetTemperature` define the default target temperature (in &#8451;) when preconditioning the vehicle.
  Defaults to 22&#8451; if the value is not specified

Exposes:

- Battery service;
- Door Lock service;
- Vehicle pre-conditioning on/off switch.

If you use the example above, you would gain Siri commands like:

- _"What is the charge level on the I-PACE?"_ (check the charge level of the battery)
- _"Is the I-PACE charging?"_ (is the car charging?)
- _"Is the I-PACE locked?"_ (check if the car is locked)
- _"Open the I-PACE"_ (unlock the vehicle)
- _"Turn on the I-PACE Preconditioning"_ (pre-condition the I-PACE)
- _"Set the I-PACE Preconditioning to 18 degrees"_

## Multiple Vehicles

Have a garage full of Jaguar Land Rovers? You can easily add all of
them to HomeKit by creating a separate accessory for each one
distinguished by their unique VIN numbers:

    {
      "accessories": [
        {
          "accessory": "Jaguar Land Rover InControl",
          "name": "I-PACE",
          "vin": "1AAAAA111AA111111",
          "username": "foo@bar.uk",
          "password": "foobar",
          "pin": 1234,
          "deviceId": "951208e8-a75d-4009-9faf-0039f728f82e",
          "lowBatteryThreshold": 30,
          "targetTemperature": 21
        },
        {
          "accessory": "Jaguar Land Rover InControl",
          "name": "Range Rover",
          "vin": "2BBBBB222BB22222",
          "username": "foo@bar.uk",
          "password": "foobar",
          "pin": 1234,
          "deviceId": "69df52b-0c86-49eb-b115-de789fd4400d",
          "targetTemperature": 18,
          "disableEV": true
        }
      ]
    }

If you use the example above, you would gain Siri commands like:

- _"Open the I-PACE"_ (unlock the **I-PACE**)
- _"Open the Range Rover"_ (unlock the **Range Rover**)
- _"Turn on the I-PACE Preconditioning"_ (pre-condition **on the I-PACE**)

## Development

You can run Rollup in watch mode to automatically transpile code as you write it:

```sh
  npm run dev
```

## Acknowledgements

This plug in is based on the work of [jlrpy](https://github.com/ardevd/jlrpy) and the excellent
reverse engineering of the [InControl API](https://documenter.getpostman.com/view/6250319/RznBMzqo)
contributed by [ardevd](https://github.com/ardevd).
