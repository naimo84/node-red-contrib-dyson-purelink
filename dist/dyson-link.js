"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DysonPurelink_1 = require("./dysonpurelink/DysonPurelink");
module.exports = function (RED) {
    function sensorNode(config) {
        RED.nodes.createNode(this, config);
        var configNode = RED.nodes.getNode(config.confignode);
        if (!configNode) {
            this.error("Config is missing!");
            return;
        }
        var node = this;
        node.config = configNode;
        node.device = config.device;
        node.action = config.action;
        node.value = config.value;
        node.deviceserial = config.deviceserial;
        var pureLink = new DysonPurelink_1.DysonPurelink(node.config.username, node.config.password, 'DE');
        pureLink.getDevices().then(function (cloud_devices) {
            if (!Array.isArray(cloud_devices) || cloud_devices.length === 0) {
                return;
            }
            cloud_devices.forEach(function (cloud_device) {
                node.debug("Cloud_devices: " + JSON.stringify(cloud_device));
                if (cloud_device.serial === node.deviceserial) {
                    pureLink.findNetworkDevices(function (network_devices) {
                        network_devices.forEach(function (network_device) {
                            node.debug("Network_device: " + JSON.stringify(network_device));
                            if (network_device.serial === node.deviceserial) {
                                cloud_device.updateNetworkInfo(network_device);
                                node.devicelink = cloud_device;
                                node.devicelink.connect('dyson_' + Math.random().toString(16));
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
        node.on('close', function () {
            if (node.devicelink)
                node.devicelink.disconnect();
        });
    }
    function getStatus(msg, node, config) {
        var device = node.devicelink;
        if (device) {
            var action = 'getFanStatus';
            if (msg.payload.action) {
                action = msg.payload.action;
            }
            else if (node.action) {
                action = node.action;
            }
            node.debug("action: " + action);
            switch (action) {
                case 'getTemperature':
                    device.getTemperature().then(function (t) { return node.send({ payload: { temperature: t } }); });
                    break;
                case 'getAirQuality':
                    device.getAirQuality().then(function (t) { return node.send({ payload: { air_quality: t } }); });
                    break;
                case 'getRelativeHumidity':
                    device.getRelativeHumidity().then(function (t) { return node.send({ payload: { relative_humidity: t } }); });
                    break;
                case 'getFanStatus':
                    device.getFanStatus().then(function (t) { return node.send({ payload: { fan_status: t } }); });
                    break;
                case 'getFanSpeed':
                    device.getFanSpeed().then(function (t) { return node.send({ payload: { fan_speed: t } }); });
                    break;
                case 'getRotationStatus':
                    device.getRotationStatus().then(function (t) { return node.send({ payload: { rotation: t } }); });
                    break;
                case 'getAutoOnStatus':
                    device.getAutoOnStatus().then(function (t) { return node.send({ payload: { auto_on: t } }); });
                    break;
                case 'setAutoOnStatus':
                    device.setAuto(true).then(function (t) { return node.send({ payload: { auto_on: t } }); });
                    break;
                case 'setAutoOffStatus':
                    device.setAuto(false).then(function (t) { return node.send({ payload: { auto_on: t } }); });
                    break;
                case 'turnOn':
                    device.turnOn();
                    break;
                case 'turnOff':
                    device.turnOff();
                    break;
                case 'setRotation':
                    device.setRotation(node.value || msg.payload.rotation).then(function (t) { return node.send({ payload: { rotation: t } }); });
                    break;
                case 'setFanSpeed':
                    device.setFanSpeed(node.value || msg.payload.speed).then(function (t) { return node.send({ payload: { fan_speed: t } }); });
                    break;
            }
        }
    }
    RED.nodes.registerType("dyson-link", sensorNode);
};

//# sourceMappingURL=dyson-link.js.map
