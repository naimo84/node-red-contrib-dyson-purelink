"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DysonPureLink = require('dyson-purelink');
module.exports = function (RED) {
    function sensorNode(config) {
        var _this = this;
        RED.nodes.createNode(this, config);
        var configNode = RED.nodes.getNode(config.confignode);
        var node = this;
        this.config = configNode;
        this.config.pureLink = new DysonPureLink(this.config.username, this.config.password, 'DE');
        try {
            node.on('input', function (msg) {
                cronCheckJob(msg, _this, _this.config);
            });
        }
        catch (err) {
            node.error('Error: ' + err.message);
            node.status({ fill: "red", shape: "ring", text: err.message });
        }
    }
    function cronCheckJob(msg, node, config) {
        config.pureLink.getDevices().then(function (devices) {
            if (!Array.isArray(devices) || devices.length === 0) {
                node.log('No devices found');
                return;
            }
            if (msg.getAction === '')
                devices[0].getTemperature().then(function (t) { return node.send(t); });
            devices[0].getAirQuality().then(function (t) { return node.send(t); });
            devices[0].getRelativeHumidity().then(function (t) { return node.send(t); });
            devices[0].getFanStatus().then(function (t) { return node.send(t); });
            devices[0].getFanSpeed().then(function (t) { return node.send(t); });
            devices[0].getRotationStatus().then(function (t) { return node.send(t); });
            devices[0].getAutoOnStatus().then(function (t) { return node.send(t); });
        }).catch(function (err) { return console.error(err); });
    }
    RED.nodes.registerType("dyson-status", sensorNode);
};
