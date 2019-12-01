"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DysonPurelink_1 = require("./dysonpurelink/DysonPurelink");
module.exports = function (RED) {
    function sensorNode(config) {
        RED.nodes.createNode(this, config);
        var configNode = RED.nodes.getNode(config.confignode);
        var node = this;
        node.config = configNode;
        node.device = config.device;
        node.deviceserial = config.deviceserial;
        var pureLink = new DysonPurelink_1.DysonPurelink(node.config.username, node.config.password, 'DE');
        pureLink.getDevices().then(function (devices) {
            if (!Array.isArray(devices) || devices.length === 0) {
                return;
            }
            for (var _i = 0, devices_1 = devices; _i < devices_1.length; _i++) {
                var device = devices_1[_i];
                if (device.serial === node.deviceserial) {
                    node.devicelink = device;
                }
            }
        }).catch(function (err) { return console.error(err); });
        try {
            node.on('input', function (msg) {
                getStatus(msg, node, node.config);
            });
        }
        catch (err) {
            node.error('Error: ' + err.message);
            node.status({ fill: "red", shape: "ring", text: err.message });
        }
    }
    function getStatus(msg, node, config) {
        var device = node.devicelink;
        if (device) {
            switch (msg.action) {
                case 'getTemperature':
                    device.getTemperature().then(function (t) { return node.send({ payload: t }); });
                    break;
                case 'getAirQuality':
                    device.getAirQuality().then(function (t) { return node.send({ payload: t }); });
                    break;
                case 'getRelativeHumidity':
                    device.getRelativeHumidity().then(function (t) { return node.send({ payload: t }); });
                    break;
                case 'getFanStatus':
                    device.getFanStatus().then(function (t) { return node.send({ payload: t }); });
                    break;
                case 'getFanSpeed':
                    device.getFanSpeed().then(function (t) { return node.send({ payload: t }); });
                    break;
                case 'getRotationStatus':
                    device.getRotationStatus().then(function (t) { return node.send({ payload: t }); });
                    break;
                case 'getAutoOnStatus':
                    device.getAutoOnStatus().then(function (t) { return node.send({ payload: t }); });
                    break;
            }
        }
    }
    RED.nodes.registerType("dyson-status", sensorNode);
};
