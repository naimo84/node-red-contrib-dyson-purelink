const bonjour = require('bonjour')()
import { DysonCloud } from "./dysonCloud";
import { Device } from "./device";

export class DysonPurelink {
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

  getDevices() {    
    return this._dysonCloud.authenticate(this._email, this._password, this._country).then(() => {
      return this._dysonCloud.getCloudDevices().then(cloudDevices => {
        let devices = new Map();
        cloudDevices.forEach(deviceInfo => {
          const device = new Device(deviceInfo);
          devices.set(device.serial, device);
        });

        return Array.from(devices.values());
      })
    })
  }

  findNetworkDevices(callback) {
    let networkDevices = new Map();
    bonjour.find({ type: 'dyson_mqtt' }, (service) => {
      let serial = service.name;
      let mqttPrefix = '475';

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

      callback(networkDevices);
    });
  }
}
