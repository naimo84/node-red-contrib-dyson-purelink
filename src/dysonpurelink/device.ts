import { EventEmitter } from 'events';
import { connect, Client } from "mqtt";

const debugdevice = require('debug')('dyson/device')

export interface DeviceInfo {
  ip: any; url?: string; port: any; mqttPrefix: any; name?: any; productType?: any;
}
export class Device extends EventEmitter {
  client: Client;
  password: string;
  username: string;
  ip: string;
  url: string;
  name: string;
  port: number;
  serial: any;
  sensitivity: any;
  _MQTTPrefix: string;
  _deviceInfo: any;
  _apiV2018: boolean;
  options: {
    keepalive: number;
    clientId: string;
    clean: boolean;
    reconnectPeriod: number;
    connectTimeout: number;
    username: string;
    password: string;
    protocolId: string,
    protocolVersion: number,
    rejectUnauthorized: boolean;
  };
  model: string;
  hardwareRevision: string;
  hasAdvancedAirQualitySensors: boolean = false;
  hasHumidifier: boolean = false;
  hasJetFocus: boolean = false;
  hasHeating: boolean = false;
  productType: any;

  constructor(deviceInfo) {
    super()

    this.password = null
    this.username = null
    this.ip = null
    this.url = null
    this.name = null
    this.port = null
    this.serial = null
    this.name = null
    this.sensitivity = deviceInfo.sensitivity || 1.0

    this._MQTTPrefix = '475'
    this._deviceInfo = deviceInfo

    if (this._deviceInfo.Serial) {
      this.serial = this._deviceInfo.Serial
    }

    if (this._deviceInfo.Name) {
      this.name = this._deviceInfo.Name
    }

    this._decryptCredentials()
  }

  connect(clientId) {
    this.options = {
      keepalive: 10,
      clientId: clientId,
      protocolId: 'MQTT',
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 10000,
      connectTimeout: 30 * 1000,
      username: this.username,
      password: this.password,
      rejectUnauthorized: false
    }
    // TP04 is 438, DP04 is 520, HP04 is 527
    this._apiV2018 = false;

    if (this._MQTTPrefix === '438' || this._MQTTPrefix === '520') {
      this.options.protocolVersion = 3
      this.options.protocolId = 'MQIsdp'
    }
    debugdevice(`productType: ${this.productType}`)
    switch (this.productType) {
      case '358':
        this.model = 'Dyson Pure Humidify+Cool';
        this.hardwareRevision = 'PH01';
        this.hasAdvancedAirQualitySensors = true;
        this.hasHumidifier = true;
        this.hasJetFocus = true;
        this._apiV2018=true;
        break;
      case '438':
        this._apiV2018=true;
        this.model = 'Dyson Pure Cool Tower';
        this.hardwareRevision = 'TP04';
        this.hasJetFocus = true;
        this.hasAdvancedAirQualitySensors = true;
        break;
      case '455':
        this.model = 'Dyson Pure Hot+Cool Link';
        this.hardwareRevision = 'HP02';
        this.hasHeating = true;
        this.hasJetFocus = true;
        break;
      case '469':
        this.model = 'Dyson Pure Cool Link Desk';
        this.hardwareRevision = 'DP01';
        this._apiV2018=true;
        break;
      case '475':
        this.model = 'Dyson Pure Cool Link Tower';
        this.hardwareRevision = 'TP02';
        break;
      case '520':
        this._apiV2018=true;
        this.model = 'Dyson Pure Cool Desk';
        this.hardwareRevision = 'DP04';
        this.hasJetFocus = true;
        this.hasAdvancedAirQualitySensors = true;
        break;
      case '527':
        this._apiV2018=true;
        this.model = 'Dyson Pure Hot+Cool';
        this.hardwareRevision = 'HP04';
        this.hasJetFocus = true;
        this.hasAdvancedAirQualitySensors = true;
        this.hasHeating = true;
        break;
    }


    debugdevice(`MQTT (${this._MQTTPrefix}): connecting to ${this.url}`)

    this.client = connect(this.url, this.options)

    this.client.on('connect', () => {
      debugdevice(`MQTT: connected to ${this.url}`)
      this.client.subscribe(this._getCurrentStatusTopic())
    })

    this.client.on('error', (err) => {
      console.error(`MQTT: error ${err}`)
      this.client.reconnect();
    })

    this.client.on('message', (topic, message) => {
      let json = JSON.parse(message.toString())
      debugdevice(`MQTT: got message ${message}`)

      if (json !== null) {
        if (json.msg === 'ENVIRONMENTAL-CURRENT-SENSOR-DATA') {
          this.emit('sensor', json)
        }
        if (json.msg === 'CURRENT-STATE') {
          this.emit('state', json)
        }
      }
    })
  }

  disconnect() {
    this.client.end();
  }

  decryptCredentials(encrypted_password) {
    let iv = Buffer.from([0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0]);
    let key = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20])

    let b64dec = (data) => {
      return Buffer.from(data, 'base64').toString('binary')
    };
    var crypto2 = require('crypto');
    let data = b64dec(encrypted_password)
    let decipher = crypto2.createDecipheriv('aes-256-cbc', key, iv);
    let decoded = decipher.update(data, 'binary', 'utf8');
    decoded += decipher.final('utf8');
    return decoded;
  }

  _decryptCredentials() {
    var decrypted = JSON.parse(this.decryptCredentials(this._deviceInfo.LocalCredentials))
    this.password = decrypted.apPasswordHash
    //debug(`password ${JSON.stringify(decrypted)}`)
    this.username = decrypted.serial
  }


  updateNetworkInfo(info: DeviceInfo) {
    this.ip = info.ip
    this.url = 'mqtt://' + this.ip
    this.name = info.name
    this.port = info.port
    this._MQTTPrefix = info.mqttPrefix || '475'
    this.productType = info.productType;
  }

  getTemperature() {
    return new Promise((resolve, reject) => {
      this.once('sensor', (json) => {
        const temperature = parseFloat(((parseInt(json.data.tact, 10) / 10) - 273.15).toFixed(2))
        resolve(temperature)
      })
      this._requestCurrentState()
    })
  }

  getRelativeHumidity() {
    return new Promise((resolve, reject) => {
      this.once('sensor', (json) => {
        const relativeHumidity = parseInt(json.data.hact)
        resolve(relativeHumidity)
      })
      this._requestCurrentState()
    })
  }

  getAirQuality() {
    return new Promise((resolve, reject) => {
      this.once('sensor', (json) => {

        // Parses the air quality sensor data
        let pm25 = 0;
        let pm10 = 0;
        let va10 = 0;
        let noxl = 0;
        let p = 0;
        let v = 0;
        if (json.data.pm10) {
          pm25 = Number.parseInt(json.data.pm25);
          pm10 = Number.parseInt(json.data.pm10);
          va10 = Number.parseInt(json.data.va10);
          noxl = Number.parseInt(json.data.noxl);
        } else {
          p = Number.parseInt(json.data.pact);
          v = Number.parseInt(json.data.vact);
        }

        // Maps the values of the sensors to the relative values described in the app (1 - 5 => Good, Medium, Bad, Very Bad, Extremely Bad)
        const pm25Quality = pm25 <= 35 ? 1 : (pm25 <= 53 ? 2 : (pm25 <= 70 ? 3 : (pm25 <= 150 ? 4 : 5)));
        const pm10Quality = pm10 <= 50 ? 1 : (pm10 <= 75 ? 2 : (pm10 <= 100 ? 3 : (pm10 <= 350 ? 4 : 5)));

        // Maps the VOC values to a self-created scale (as described values in the app don't fit)
        const va10Quality = (va10 * 0.125) <= 3 ? 1 : ((va10 * 0.125) <= 6 ? 2 : ((va10 * 0.125) <= 8 ? 3 : 4));

        // Maps the NO2 value ti a self-created scale
        const noxlQuality = noxl <= 30 ? 1 : (noxl <= 60 ? 2 : (noxl <= 80 ? 3 : (noxl <= 90 ? 4 : 5)));

        // Maps the values of the sensors to the relative values, these operations are copied from the newer devices as the app does not specify the correct values
        const pQuality = p <= 2 ? 1 : (p <= 4 ? 2 : (p <= 7 ? 3 : (p <= 9 ? 4 : 5)));
        const vQuality = (v * 0.125) <= 3 ? 1 : ((v * 0.125) <= 6 ? 2 : ((v * 0.125) <= 8 ? 3 : 4));


        let airQuality = 0
        debugdevice(`hasAdvancedAirQualitySensors: ${this.hasAdvancedAirQualitySensors}`)
        debugdevice(`hasJetFocus: ${this.hasJetFocus}`)
        debugdevice(`hasHeating: ${this.hasHeating}`)
        debugdevice(`hasHumidifier: ${this.hasHumidifier}`)
        if (json.data.pm10) {
          airQuality = Math.max(pm25Quality, pm10Quality, va10Quality, noxlQuality)
        } else {
          airQuality = Math.max(pQuality, vQuality)
        }

        resolve(airQuality)
      })
      this._requestCurrentState()
    })
  }

  getFanStatus() {
    return new Promise((resolve, reject) => {
      this.once('state', (json) => {
        debugdevice(json)
        let on = json['product-state']['fmod'] === "FAN" ||
          json['product-state']['fmod'] === "AUTO" ||
          json['product-state']['fpwr'] === "ON";
        resolve(on)
      })
      this._requestCurrentState()
    })
  }

  getFanSpeed() {
    return new Promise((resolve, reject) => {
      this.once('state', (json) => {
        const fnsp = json['product-state']['fnsp']
        const rotationSpeed = fnsp === 'AUTO' ? 'AUTO' : parseInt(fnsp, 10)
        resolve(rotationSpeed)
      })
      this._requestCurrentState()
    })
  }

  getAutoOnStatus() {
    return new Promise((resolve, reject) => {
      this.once('state', (json) => {
        const isOn = (json['product-state']['auto'] === 'ON')
        resolve(isOn)
      })
      this._requestCurrentState()
    })
  }

  getRotationStatus() {
    return new Promise((resolve, reject) => {
      this.once('state', (json) => {
        const oson = json['product-state']['oson']
        const isOn = (oson === 'ON')
        resolve(isOn)
      })
      this._requestCurrentState()
    })
  }

  turnOff() {
    return this.setFan(false)
  }

  turnOn() {
    return this.setFan(true)
  }

  setFan(value) {

    const data = this._apiV2018 ? { fpwr: value ? 'ON' : 'OFF' } : { fmod: value ? 'FAN' : 'OFF' }
    debugdevice(`setFan - data: ${JSON.stringify(data)}`)
    this._setStatus(data)
    return this.getFanStatus()
  }

  setFanSpeed(value) {
    const fnsp = Math.round(value / 10)
    this._setStatus({ fnsp: this._apiV2018 ? "000" + fnsp : fnsp })
    return this.getFanSpeed()
  }

  setSleepTimer(minutes) {
    this._setStatus({ sltm: minutes })
    return this.getSleepTimer()

  }

  getSleepTimer() {
    return new Promise((resolve, reject) => {
      this.once('state', (json) => {
        const sltm = json['product-state']['sltm']
        const minutes = parseInt(sltm)
        resolve(minutes)
      })
      this._requestCurrentState()
    })
  }

  setHeat(value) {
    if (value) {
      this._setStatus({ hmod: "HEAT" });
    }
    else {
      this._setStatus({ fmod: "FAN" });
      this._setStatus({ hmod: "OFF" });
    }
  }

  setAuto(value) {
    if (value && this._apiV2018) {
      this.turnOn();
    }
    const data = this._apiV2018 ? { auto: value ? 'ON' : 'OFF' } : { fmod: value ? 'AUTO' : 'OFF' }
    this._setStatus(data)
    return this.getAutoOnStatus()
  }

  setRotation(value) {
    const oson = value ? 'ON' : 'OFF'
    this._setStatus({ oson })
    return this.getRotationStatus()
  }

  _requestCurrentState() {
    debugdevice(`MQTT: ${JSON.stringify(this._getCommandTopic())}`);
    this.client.publish(this._getCommandTopic(), JSON.stringify({
      msg: 'REQUEST-CURRENT-STATE',
      time: new Date().toISOString()
    }));
  }

  _setStatus(data) {
    const message = JSON.stringify({
      msg: 'STATE-SET',
      "mode-reason": "LAPP",
      time: new Date().toISOString(),
      data
    })

    this.client.publish(
      this._getCommandTopic(),
      message
    )
  }

  _getCurrentStatusTopic() {
    return `${this._MQTTPrefix}/${this.username}/status/current`
  }

  _getCommandTopic() {
    return `${this._MQTTPrefix}/${this.username}/command`
  }
}


