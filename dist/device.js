"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var mqtt = require('mqtt');
var EventEmitter = require('events');
var decrypt = require('./decrypt');
var debugdevice = require('debug')('dyson/device');
var Device = /** @class */ (function (_super) {
    __extends(Device, _super);
    function Device(deviceInfo) {
        var _this = _super.call(this) || this;
        _this.password = null;
        _this.username = null;
        _this.ip = null;
        _this.url = null;
        _this.name = null;
        _this.port = null;
        _this.serial = null;
        _this.name = null;
        _this.sensitivity = deviceInfo.sensitivity || 1.0;
        _this._MQTTPrefix = '475';
        _this._deviceInfo = deviceInfo;
        if (_this._deviceInfo.Serial) {
            _this.serial = _this._deviceInfo.Serial;
        }
        if (_this._deviceInfo.Name) {
            _this.name = _this._deviceInfo.Name;
        }
        _this._decryptCredentials();
        return _this;
    }
    Device.prototype.updateNetworkInfo = function (info) {
        this.ip = info.ip;
        this.url = 'mqtt://' + this.ip;
        this.name = info.name;
        this.port = info.port;
        this._MQTTPrefix = info.mqttPrefix || '475';
        // debugdevice('updateNetworkInfo', JSON.stringify(info))
        this._connect();
    };
    Device.prototype.getTemperature = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.once('sensor', function (json) {
                var temperature = parseFloat(((parseInt(json.data.tact, 10) / 10) - 273.15).toFixed(2));
                resolve(temperature);
            });
            _this._requestCurrentState();
        });
    };
    Device.prototype.getRelativeHumidity = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.once('sensor', function (json) {
                var relativeHumidity = parseInt(json.data.hact);
                resolve(relativeHumidity);
            });
            _this._requestCurrentState();
        });
    };
    Device.prototype.getAirQuality = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.once('sensor', function (json) {
                var dustValue = Number.parseInt(json.data.pact || json.data.pm10);
                var vocValue = Number.parseInt(json.data.vact || json.data.va10);
                var airQuality = 0;
                if (isNaN(dustValue) || isNaN(vocValue)) {
                    airQuality = 0;
                }
                else {
                    airQuality = Math.min(Math.max(Math.floor((dustValue + vocValue) / 2 * _this.sensitivity), 1), 5);
                }
                resolve(airQuality);
            });
            _this._requestCurrentState();
        });
    };
    Device.prototype.getFanStatus = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.once('state', function (json) {
                var fpwr = _this._apiV2018 ? json['product-state']['fmod'] : json['product-state']['fpwr'];
                var isOn = _this._apiV2018 ? (fpwr === 'FAN') : (fpwr === 'ON');
                resolve(isOn);
            });
            _this._requestCurrentState();
        });
    };
    Device.prototype.getFanSpeed = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.once('state', function (json) {
                var fnsp = json['product-state']['fnsp'];
                var rotationSpeed = fnsp === 'AUTO' ? 'AUTO' : parseInt(fnsp, 10);
                resolve(rotationSpeed);
            });
            _this._requestCurrentState();
        });
    };
    Device.prototype.getAutoOnStatus = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.once('state', function (json) {
                var isOn = (json['product-state']['auto'] === 'ON');
                resolve(isOn);
            });
            _this._requestCurrentState();
        });
    };
    Device.prototype.getRotationStatus = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.once('state', function (json) {
                var oson = json['product-state']['oson'];
                var isOn = (oson === 'ON');
                resolve(isOn);
            });
            _this._requestCurrentState();
        });
    };
    Device.prototype.turnOff = function () {
        return this.setFan(false);
    };
    Device.prototype.turnOn = function () {
        return this.setFan(true);
    };
    Device.prototype.setFan = function (value) {
        var data = !this._apiV2018 ? { fpwr: value ? 'ON' : 'OFF' } : { fmod: value ? 'FAN' : 'OFF' };
        this._setStatus(data);
        return this.getFanStatus();
    };
    Device.prototype.setFanSpeed = function (value) {
        var fnsp = Math.round(value / 10);
        this._setStatus({ fnsp: this._apiV2018 ? "000" + fnsp : fnsp });
        return this.getFanSpeed();
    };
    Device.prototype.setAuto = function (value) {
        var data = this._apiV2018 ? { auto: value ? 'ON' : 'OFF' } : { fmod: value ? 'AUTO' : 'OFF' };
        this._setStatus(data);
        return this.getAutoOnStatus();
    };
    Device.prototype.setRotation = function (value) {
        var oson = value ? 'ON' : 'OFF';
        this._setStatus({ oson: oson });
        return this.getRotationStatus();
    };
    Device.prototype._connect = function () {
        var _this = this;
        this.options = {
            keepalive: 10,
            clientId: 'dyson_' + Math.random().toString(16),
            // protocolId: 'MQTT',
            // protocolVersion: 4,
            clean: true,
            reconnectPeriod: 1000,
            connectTimeout: 30 * 1000,
            username: this.username,
            password: this.password,
            rejectUnauthorized: false
        };
        this._apiV2018 = this._MQTTPrefix === '438' || this._MQTTPrefix === '455';
        if (this._apiV2018 || this._MQTTPrefix === '520') {
            this.options.protocolVersion = 3;
            this.options.protocolId = 'MQIsdp';
        }
        debugdevice("MQTT (" + this._MQTTPrefix + "): connecting to " + this.url);
        this.client = mqtt.connect(this.url, this.options);
        this.client.on('connect', function () {
            debugdevice("MQTT: connected to " + _this.url);
            _this.client.subscribe(_this._getCurrentStatusTopic());
        });
        this.client.on('message', function (topic, message) {
            var json = JSON.parse(message);
            debugdevice("MQTT: got message " + message);
            if (json !== null) {
                if (json.msg === 'ENVIRONMENTAL-CURRENT-SENSOR-DATA') {
                    _this.emit('sensor', json);
                }
                if (json.msg === 'CURRENT-STATE') {
                    _this.emit('state', json);
                }
            }
        });
    };
    Device.prototype._decryptCredentials = function () {
        var decrypted = JSON.parse(decrypt(this._deviceInfo.LocalCredentials));
        this.password = decrypted.apPasswordHash;
        this.username = decrypted.serial;
    };
    Device.prototype._requestCurrentState = function () {
        console.log(this.client);
        this.client.publish(this._getCommandTopic(), JSON.stringify({
            msg: 'REQUEST-CURRENT-STATE',
            time: new Date().toISOString()
        }));
    };
    Device.prototype._setStatus = function (data) {
        var message = JSON.stringify({
            msg: 'STATE-SET',
            "mode-reason": "LAPP",
            time: new Date().toISOString(),
            data: data
        });
        this.client.publish(this._getCommandTopic(), message);
    };
    Device.prototype._getCurrentStatusTopic = function () {
        return this._MQTTPrefix + "/" + this.username + "/status/current";
    };
    Device.prototype._getCommandTopic = function () {
        return this._MQTTPrefix + "/" + this.username + "/command";
    };
    return Device;
}(EventEmitter));
exports.Device = Device;
module.exports = Device;
