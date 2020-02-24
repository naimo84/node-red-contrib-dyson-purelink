"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bonjour = require('bonjour')();
var dysonCloud_1 = require("./dysonCloud");
var device_1 = require("./device");
var DysonPurelink = /** @class */ (function () {
    function DysonPurelink(email, password, country) {
        this._email = email;
        this._password = password;
        this._country = country;
        this._dysonCloud = new dysonCloud_1.DysonCloud();
    }
    DysonPurelink.prototype.getDevices = function () {
        var _this = this;
        return this._dysonCloud.authenticate(this._email, this._password, this._country).then(function () {
            return _this._dysonCloud.getCloudDevices().then(function (cloudDevices) {
                var devices = new Map();
                cloudDevices.forEach(function (deviceInfo) {
                    var device = new device_1.Device(deviceInfo);
                    devices.set(device.serial, device);
                });
                return Array.from(devices.values());
            });
        });
    };
    DysonPurelink.prototype.findNetworkDevices = function (callback) {
        var networkDevices = new Map();
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
            console.log("Got network device: " + networkDevice.serial);
            networkDevices.set(networkDevice.serial, networkDevice);
            callback(networkDevices);
        });
    };
    return DysonPurelink;
}());
exports.DysonPurelink = DysonPurelink;

//# sourceMappingURL=DysonPurelink.js.map
