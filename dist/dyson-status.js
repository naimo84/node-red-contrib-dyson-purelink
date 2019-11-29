"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = function (RED) {
    function sensorNode(config) {
        RED.nodes.createNode(this, config);
        var configNode = RED.nodes.getNode(config.confignode);
        var node = this;
        node.config = configNode;
        node.device = config.device;
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
        var device = node.device;
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
