"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bonjour = require('bonjour')();
var dysonCloud_1 = require("./dysonCloud");
var device_1 = require("./device");
var debug = require('debug')('dyson');
var DysonPurelink = /** @class */ (function () {
    function DysonPurelink(email, password, country) {
        this._email = email;
        this._password = password;
        this._country = country;
        this._networkDevices = new Map();
        this._dysonCloud = new dysonCloud_1.DysonCloud();
        this._devices = new Map();
        this._findNetworkDevices();
    }
    DysonPurelink.prototype.getDevices = function () {
        var _this = this;
        return this._dysonCloud.authenticate(this._email, this._password, this._country).then(function () {
            return _this._dysonCloud.getCloudDevices().then(function (cloudDevices) {
                cloudDevices.forEach(function (deviceInfo) {
                    var device = new device_1.Device(deviceInfo);
                    if (_this._networkDevices.has(device.serial)) {
                        var networkDevice = _this._networkDevices.get(device.serial);
                        device.updateNetworkInfo(networkDevice);
                    }
                    _this._devices.set(device.serial, device);
                });
                return Array.from(_this._devices.values());
            });
        });
    };
    DysonPurelink.prototype._findNetworkDevices = function () {
        var _this = this;
        bonjour.find({ type: 'dyson_mqtt' }, function (service) {
            var serial = service.name;
            var mqttPrefix = '475';
            if (serial.includes('_')) {
                serial = serial.split('_');
                mqttPrefix = serial[0];
                serial = serial[1];
            }
            var networkDevice = {
                name: service.name,
                ip: service.addresses[0],
                port: service.port,
                serial: serial,
                mqttPrefix: mqttPrefix
            };
            debug("Got network device: " + networkDevice.serial);
            // Update devices with network info or push to network collectio
            if (_this._devices.has(networkDevice.serial)) {
                _this._devices.get(networkDevice.serial).updateNetworkInfo(networkDevice);
            }
            else {
                _this._networkDevices.set(networkDevice.serial, networkDevice);
            }
        });
    };
    return DysonPurelink;
}());
exports.DysonPurelink = DysonPurelink;
