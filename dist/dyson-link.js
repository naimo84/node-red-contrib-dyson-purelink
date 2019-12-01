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
        pureLink.getDevices().then(function (cloud_devices) {
            if (!Array.isArray(cloud_devices) || cloud_devices.length === 0) {
                return;
            }
            cloud_devices.forEach(function (cloud_device) {
                if (cloud_device.serial === node.deviceserial) {
                    pureLink.findNetworkDevices(function (network_devices) {
                        network_devices.forEach(function (network_device) {
                            if (network_device.serial === node.deviceserial) {
                                cloud_device.updateNetworkInfo(network_device);
                                node.devicelink = cloud_device;
                                node.devicelink.connect();
                            }
                        });
                    });
                }
            });
        });
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
                case 'turnOn':
                    device.turnOn();
                    break;
                case 'turnOff':
                    device.turnOff();
                    break;
                case 'setRotation':
                    device.setRotation(msg.rotation).then(function (t) { return node.send({ payload: t }); });
                    break;
                case 'setFanSpeed':
                    device.setFanSpeed(msg.speed).then(function (t) { return node.send({ payload: t }); });
                    break;
            }
        }
    }
    RED.nodes.registerType("dyson-link", sensorNode);
};
