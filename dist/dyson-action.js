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
                action(msg, node, node.config);
            });
        }
        catch (err) {
            node.error('Error: ' + err.message);
            node.status({ fill: "red", shape: "ring", text: err.message });
        }
    }
    function action(msg, node, config) {
        var device = node.device;
        if (device) {
            switch (msg.action) {
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
    RED.nodes.registerType("dyson-action", sensorNode);
};
