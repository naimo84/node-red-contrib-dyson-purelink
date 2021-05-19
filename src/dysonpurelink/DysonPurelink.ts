const bonjour = require('bonjour')()
import { DysonCloud } from "./dysonCloud";
import { Device } from "./device";
import { debug } from "console";

export default class DysonPurelink {
  _email: string;
  _password: string;
  _country: string;
  public otp: string;
  _dysonCloud: DysonCloud;

  constructor(email, password, country) {
    this._email = email;
    this._password = password;
    this._country = country;

    this._dysonCloud = new DysonCloud();
  }

  async getDevices() {   
    const cloudDevices = await this._dysonCloud.getCloudDevices();
    let devices = new Map();
    cloudDevices.data.forEach((deviceInfo: any) => {
      const device = new Device(deviceInfo);
      devices.set(device.serial, device);
    });
    return Array.from(devices.values());
  }
}

export async function findNetworkDevices(): Promise<any> {
  debug(`findNetworkDevices`);
  let networkDevices = new Map();
  let service = await bonjour.find({ type: 'dyson_mqtt' });
  let serial = service.name || service._name;
  let mqttPrefix = '475';
  debug(`service ${JSON.stringify(service)}`)
  if (serial.includes('_')) {
    serial = serial.split('_');
    debug(serial)
    mqttPrefix = serial[0];
    serial = serial[1];
  }

  const networkDevice = {
    name: service.name,
    ip: service.addresses ? service.addresses[0] : 0,
    port: service.port,
    serial,
    mqttPrefix
  }

  debug(`Got network device: ${networkDevice.serial}`);

  networkDevices.set(networkDevice.serial, networkDevice);


  return networkDevices;
}