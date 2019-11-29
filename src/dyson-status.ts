
import { Red, Node } from 'node-red';


export interface DysonNode extends Node {
    device: any;
}

module.exports = function (RED: Red) {
    function sensorNode(config: any) {
        RED.nodes.createNode(this, config);
        let configNode = RED.nodes.getNode(config.confignode);
        let node = this;
        node.config = configNode;
        node.device = config.device;

        try {
            node.on('input', (msg) => {
                getStatus(msg, node, node.config);
            });
        }
        catch (err) {
            node.error('Error: ' + err.message);
            node.status({ fill: "red", shape: "ring", text: err.message })
        }
    }

    function getStatus(msg: any, node: DysonNode, config: any) {
        let device = node.device;
        if (device) {
            switch (msg.action) {
                case 'getTemperature':
                    device.getTemperature().then(t => node.send({ payload: t }))
                    break;
                case 'getAirQuality':
                    device.getAirQuality().then(t => node.send({ payload: t }))
                    break;
                case 'getRelativeHumidity':
                    device.getRelativeHumidity().then(t => node.send({ payload: t }))
                    break;
                case 'getFanStatus':
                    device.getFanStatus().then(t => node.send({ payload: t }))
                    break;
                case 'getFanSpeed':
                    device.getFanSpeed().then(t => node.send({ payload: t }))
                    break;
                case 'getRotationStatus':
                    device.getRotationStatus().then(t => node.send({ payload: t }))
                    break;
                case 'getAutoOnStatus':
                    device.getAutoOnStatus().then(t => node.send({ payload: t }))
                    break;
            }
        }
    }

    RED.nodes.registerType("dyson-status", sensorNode);
}