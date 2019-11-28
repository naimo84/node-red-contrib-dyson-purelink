
import { Red, Node } from 'node-red';
import { debounce } from "lodash";
import { DysonPurelink } from "./DysonPurelink";

module.exports = function (RED: Red) {
    function sensorNode(config: any) {
        RED.nodes.createNode(this, config);
        let configNode = RED.nodes.getNode(config.confignode);
        let node = this;
        this.config = configNode;

        try {
            node.on('input', (msg) => {
                debounce(() => cronCheckJob(msg, this, this.config), 2000);
            });
        }
        catch (err) {
            node.error('Error: ' + err.message);
            node.status({ fill: "red", shape: "ring", text: err.message })
        }
    }

    function cronCheckJob(msg: any, node: Node, config: any) {
        let pureLink = new DysonPurelink(config.username, config.password);
        pureLink.getDevices().then(devices => {
            if (!Array.isArray(devices) || devices.length === 0) {
                node.log('No devices found')
                return
            }

            switch (msg.action) {
                case 'turnOn':
                    devices[0].turnOn();
                    break;
                case 'turnOff':
                    devices[0].turnOff();
                    break;
                case 'setRotation':
                    devices[0].setRotation(msg.rotation).then(t => node.send({ payload: t }))
                    break;
                case 'setFanSpeed':
                    devices[0].setFanSpeed(msg.speed).then(t => node.send({ payload: t }))
                    break;
            }



        }).catch(err => node.error(err))
    }

    RED.nodes.registerType("dyson-action", sensorNode);
}