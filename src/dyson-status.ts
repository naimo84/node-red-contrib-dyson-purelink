
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
                debounce(() => cronCheckJob.bind(null, msg, this, this.config), 2000);
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
                case 'getTemperature':
                    devices[0].getTemperature().then(t => node.send({ payload: t }))
                    break;
                case 'getAirQuality':
                    devices[0].getAirQuality().then(t => node.send({ payload: t }))
                    break;
                case 'getRelativeHumidity':
                    devices[0].getRelativeHumidity().then(t => node.send({ payload: t }))
                    break;
                case 'getFanStatus':
                    devices[0].getFanStatus().then(t => node.send({ payload: t }))
                    break;
                case 'getFanSpeed':
                    devices[0].getFanSpeed().then(t => node.send({ payload: t }))
                    break;
                case 'getRotationStatus':
                    devices[0].getRotationStatus().then(t => node.send({ payload: t }))
                    break;
                case 'getAutoOnStatus':
                    devices[0].getAutoOnStatus().then(t => node.send({ payload: t }))
                    break;
            }



        }).catch(err => node.error(err))
    }

    RED.nodes.registerType("dyson-status", sensorNode);
}