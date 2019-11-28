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
            switch (msg.action) {
                case 'turnOn':
                    devices[0].turnOn();
                    break;
                case 'turnOff':
                    devices[0].turnOff();
                    break;
                case 'setRotation':
                    devices[0].setRotation(msg.rotation).then(function (t) { return node.send({ payload: t }); });
                    break;
                case 'setFanSpeed':
                    devices[0].setFanSpeed(msg.speed).then(function (t) { return node.send({ payload: t }); });
                    break;
            }
        }).catch(function (err) { return node.error(err); });
    }
    RED.nodes.registerType("dyson-action", sensorNode);
};
