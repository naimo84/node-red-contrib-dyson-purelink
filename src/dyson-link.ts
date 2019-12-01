
import { Red, Node } from 'node-red';
import { DysonPurelink } from './dysonpurelink/DysonPurelink';


export interface DysonNode extends Node {
    device: any;
    devicelink: any;
    action: any;
    value: any;
}

module.exports = function (RED: Red) {
    function sensorNode(config: any) {
        RED.nodes.createNode(this, config);
        let configNode = RED.nodes.getNode(config.confignode);
        let node = this;
        node.config = configNode;
        node.device = config.device;
        node.action = config.action;
        node.value = config.value;
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
                                node.devicelink.connect('dyson_' + Math.random().toString(16));
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

        node.on('close', () => {
            node.devicelink.disconnect();
        });
    }

    function getStatus(msg: any, node: DysonNode, config: any) {
        let device = node.devicelink;
        if (device) {
            let action = 'getFanStatus';
            if (msg.payload.action) {
                action = msg.payload.action
            } else if (node.action) {
                action = node.action
            }

            switch (action) {
                case 'getTemperature':
                    device.getTemperature().then(t => node.send({ payload: { temperature: t } }))
                    break;
                case 'getAirQuality':
                    device.getAirQuality().then(t => node.send({ payload: { air_quality: t } }))
                    break;
                case 'getRelativeHumidity':
                    device.getRelativeHumidity().then(t => node.send({ payload: { relative_humidity: t } }))
                    break;
                case 'getFanStatus':
                    device.getFanStatus().then(t => node.send({ payload: { fan_status: t } }))
                    break;
                case 'getFanSpeed':
                    device.getFanSpeed().then(t => node.send({ payload: { fan_speed: t } }))
                    break;
                case 'getRotationStatus':
                    device.getRotationStatus().then(t => node.send({ payload: { rotation: t } }))
                    break;
                case 'getAutoOnStatus':
                    device.getAutoOnStatus().then(t => node.send({ payload: { auto_on: t } }))
                    break;
                case 'turnOn':
                    device.turnOn();
                    break;
                case 'turnOff':
                    device.turnOff();
                    break;
                case 'setRotation':
                    device.setRotation(node.value || msg.rotation).then(t => node.send({ payload: { rotation: t } }))
                    break;
                case 'setFanSpeed':
                    device.setFanSpeed(node.value || msg.speed).then(t => node.send({ payload: { fan_speed: t } }))
                    break;
            }
        }
    }

    RED.nodes.registerType("dyson-link", sensorNode);
}