
import { Red, Node } from 'node-red';
var DysonPureLink = require('dyson-purelink')

module.exports = function (RED: Red) {
    function sensorNode(config: any) {
        RED.nodes.createNode(this, config);
        let configNode = RED.nodes.getNode(config.confignode);
        let node = this;       
        this.config = configNode;   
        this.config.pureLink = new DysonPureLink( this.config.username,  this.config.password, 'DE');    

        try {
            node.on('input', (msg) => {
                cronCheckJob(msg, this,  this.config);
            });          
        }
        catch (err) {
            node.error('Error: ' + err.message);
            node.status({ fill: "red", shape: "ring", text: err.message })
        }
    }

    function cronCheckJob(msg:any, node: Node, config: any) {             
        config.pureLink.getDevices().then(devices => {        
            if(!Array.isArray(devices) || devices.length === 0) {
                node.log('No devices found')
                return
            } 

            if(msg.getAction==='')

            devices[0].getTemperature().then(t => node.send(t))
            devices[0].getAirQuality().then(t => node.send(t))
            devices[0].getRelativeHumidity().then(t => node.send(t))
        
            devices[0].getFanStatus().then(t => node.send(t))
            devices[0].getFanSpeed().then(t => node.send(t))
            devices[0].getRotationStatus().then(t => node.send(t))
            devices[0].getAutoOnStatus().then(t => node.send(t))
        
            
        }).catch(err => console.error(err))        
    }

    RED.nodes.registerType("dyson-status", sensorNode);
}