
import { Red, Node } from 'node-red';
import { DysonPurelink } from './dysonpurelink/DysonPurelink';


export interface DysonNode extends Node {
    device: any;
    devicelink: any;
}

module.exports = function (RED: Red) {
    function sensorNode(config: any) {
        RED.nodes.createNode(this, config);
        let configNode = RED.nodes.getNode(config.confignode);
        let node = this;
        node.config = configNode;
        node.device = config.device;
        node.deviceserial = config.deviceserial;

        let pureLink = new DysonPurelink(node.config.username, node.config.password, 'DE');
        pureLink.getDevices().then(cloud_devices => {
            if (!Array.isArray(cloud_devices) || cloud_devices.length === 0) {
                return
            }
            cloud_devices.forEach((cloud_device) => {
                if (cloud_device.serial === node.deviceserial) {
                    pureLink.findNetworkDevices((network_devices) => {
                        network_devices.forEach(network_device => {
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
        let device = node.devicelink;
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
                case 'turnOn':
                    device.turnOn();
                    break;
                case 'turnOff':
                    device.turnOff();
                    break;
                case 'setRotation':
                    device.setRotation(msg.rotation).then(t => node.send({ payload: t }))
                    break;
                case 'setFanSpeed':
                    device.setFanSpeed(msg.speed).then(t => node.send({ payload: t }))
                    break;
            }
        }
    }

    RED.nodes.registerType("dyson-link", sensorNode);
}