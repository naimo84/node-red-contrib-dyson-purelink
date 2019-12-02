import { EventEmitter } from 'events';
import { connect, Client } from "mqtt";
const debugdevice = require('debug')('dyson/device')

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

  updateNetworkInfo(info) {
    this.ip = info.ip
    this.url = 'mqtt://' + this.ip
    this.name = info.name
    this.port = info.port
    this._MQTTPrefix = info.mqttPrefix || '475'
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
        let dustValue = Number.parseInt(json.data.pact || json.data.pm10)
        let vocValue = Number.parseInt(json.data.vact || json.data.va10)
        let airQuality = 0

        if (isNaN(dustValue) || isNaN(vocValue)) {
          airQuality = 0
        } else {
          airQuality = Math.min(Math.max(Math.floor((dustValue + vocValue) / 2 * this.sensitivity), 1), 5)
        }

        resolve(airQuality)
      })
      this._requestCurrentState()
    })
  }

  getFanStatus() {
    return new Promise((resolve, reject) => {
      this.once('state', (json) => {
        const fpwr = this._apiV2018 ? json['product-state']['fmod'] : json['product-state']['fpwr']
        const isOn = this._apiV2018 ? (fpwr === 'FAN') : (fpwr === 'ON')

        resolve(isOn)
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
    const data = !this._apiV2018 ? { fpwr: value ? 'ON' : 'OFF' } : { fmod: value ? 'FAN' : 'OFF' }
    this._setStatus(data)
    return this.getFanStatus()
  }

  setFanSpeed(value) {
    const fnsp = Math.round(value / 10)
    this._setStatus({ fnsp: this._apiV2018 ? "000" + fnsp : fnsp })
    return this.getFanSpeed()
  }

  setAuto(value) {
    const data = this._apiV2018 ? { auto: value ? 'ON' : 'OFF' } : { fmod: value ? 'AUTO' : 'OFF' }
    this._setStatus(data)
    return this.getAutoOnStatus()
  }

  setRotation(value) {
    const oson = value ? 'ON' : 'OFF'
    this._setStatus({ oson })
    return this.getRotationStatus()
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

    this._apiV2018 = this._MQTTPrefix === '438' || this._MQTTPrefix === '455'

    if (this._apiV2018 || this._MQTTPrefix === '520') {
      this.options.protocolVersion = 3
      this.options.protocolId = 'MQIsdp'
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
    this.username = decrypted.serial
  }

  _requestCurrentState() {
    debugdevice(`MQTT: ${this.client}`);
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


