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
        var pureLink = new DysonPureLink(config.username, config.password, 'DE');
        pureLink.getDevices().then(function (devices) {
            if (!Array.isArray(devices) || devices.length === 0) {
                node.log('No devices found');
                return;
            }
            switch (msg.action) {
                case 'getTemperature':
                    devices[0].getTemperature().then(function (t) { return node.send({ payload: t }); });
                    break;
                case 'getAirQuality':
                    devices[0].getAirQuality().then(function (t) { return node.send({ payload: t }); });
                    break;
                case 'getRelativeHumidity':
                    devices[0].getRelativeHumidity().then(function (t) { return node.send({ payload: t }); });
                    break;
                case 'getFanStatus':
                    devices[0].getFanStatus().then(function (t) { return node.send({ payload: t }); });
                    break;
                case 'getFanSpeed':
                    devices[0].getFanSpeed().then(function (t) { return node.send({ payload: t }); });
                    break;
                case 'getRotationStatus':
                    devices[0].getRotationStatus().then(function (t) { return node.send({ payload: t }); });
                    break;
                case 'getAutoOnStatus':
                    devices[0].getAutoOnStatus().then(function (t) { return node.send({ payload: t }); });
                    break;
            }
        }).catch(function (err) { return node.error(err); });
    }
    RED.nodes.registerType("dyson-status", sensorNode);
};
