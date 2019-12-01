const bonjour = require('bonjour')()
import { DysonCloud } from "./dysonCloud";
import { Device } from "./device";
const debug = require('debug')('dyson')

export class DysonPurelink {
  _email: any;
  _password: any;
  _country: any;
  _networkDevices: Map<any, any>;
  _dysonCloud: DysonCloud;
  _devices: Map<any, any>;

  constructor(email, password, country) {
    this._email = email;
    this._password = password;
    this._country = country;
    this._networkDevices = new Map();
    this._dysonCloud = new DysonCloud();
    this._devices = new Map();


  }

  getDevices() {
    return this._dysonCloud.authenticate(this._email, this._password, this._country).then(() => {
      return this._dysonCloud.getCloudDevices().then(cloudDevices => {
        cloudDevices.forEach(deviceInfo => {
          const device = new Device(deviceInfo);
          this._devices.set(device.serial, device);
        });

        return Array.from(this._devices.values());
      })
    })
  }

  findNetworkDevices(callback) {
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

      this._networkDevices.set(networkDevice.serial, networkDevice);

      callback(this._networkDevices);
    });

  }
}
