const bonjour = require('bonjour')()
import { DysonCloud } from "./dysonCloud";
import { Device } from "./device";
import { debug } from "console";

export default class DysonPurelink {
  _email: string;
  _password: string;
  _country: string;
  _dysonCloud: DysonCloud;

  constructor(email, password, country) {
    this._email = email;
    this._password = password;
    this._country = country;
    this._dysonCloud = new DysonCloud();
  }

  async getDevices() {
    await this._dysonCloud.authenticate(this._email, this._password, this._country);
    const cloudDevices = await this._dysonCloud.getCloudDevices();
    let devices = new Map();
    cloudDevices.forEach((deviceInfo: any) => {
      const device = new Device(deviceInfo);
      devices.set(device.serial, device);
    });
    return Array.from(devices.values());
  }

  
}

export async function findNetworkDevices(): Promise<any> {
  console.log(`findNetworkDevices`);
  let networkDevices = new Map();    
  let service = await bonjour.find({ type: 'dyson_mqtt' });
  let serial = service.name;
  let mqttPrefix = '475';
  debug(`service ${JSON.stringify(service)}`)
  if (serial.includes('_')) {
    serial = serial.split('_');
    mqttPrefix = serial[0];
    serial = serial[1];
  }

  const networkDevice = {
    name: service.name,
    ip: service.addresses[0],
    port: service.port,
    serial,
    mqttPrefix
  }

  console.log(`Got network device: ${networkDevice.serial}`);

  networkDevices.set(networkDevice.serial, networkDevice);


  return networkDevices;
}