
import { Red, Node } from 'node-red';
import { DysonPurelink } from "./dysonpurelink/DysonPurelink";
import { DysonNode } from './dyson-status';

module.exports = function (RED: Red) {
    function sensorNode(config: any) {
        RED.nodes.createNode(this, config);
        let configNode = RED.nodes.getNode(config.confignode);
        let node = this;
        node.config = configNode;
        node.device = config.device;
        node.deviceserial = config.deviceserial;

        let pureLink = new DysonPurelink(node.config.username, node.config.password, 'DE');
        pureLink.getDevices().then(devices => {
            if (!Array.isArray(devices) || devices.length === 0) {
                return
            }
            for (let device of devices) {
                if(device.serial ===  node.deviceserial){
                    node.devicelink=device;
                }
            }
        }).catch(err => console.error(err));
      
        try {
            node.on('input', (msg) => {
                action(msg, node, node.config);
            });
        }
        catch (err) {
            node.error('Error: ' + err.message);
            node.status({ fill: "red", shape: "ring", text: err.message })
        }
    }

    function action(msg: any, node: DysonNode, config: any) {
        let device = node.devicelink;
        if (device) {
            switch (msg.action) {
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

    RED.nodes.registerType("dyson-action", sensorNode);
}