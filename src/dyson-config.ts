import { DysonPurelink } from "./dysonpurelink/DysonPurelink";
import { filter } from "lodash";

module.exports = function (RED: any) {
    function config(config) {
        RED.nodes.createNode(this, config);

        this.username = config.username;
        this.password = config.password;
        this.country = config.country;
        this.config = this;
    }

    RED.httpAdmin.get("/dysonDevices/:id", function (req, res) {
        RED.log.debug("GET /dysonDevices");
        const nodeId = req.params.id;
        let config = RED.nodes.getNode(nodeId);
      
        let pureLink = new DysonPurelink(config.username, config.password, 'DE');
        pureLink.getDevices().then(devices => {
            if (!Array.isArray(devices) || devices.length === 0) {              
                return
            }
            let ret = [];
            for(let device of devices){
                ret.push(device._deviceInfo)
            }
            res.json(ret);
        }).catch(err => console.error(err));
    });

    RED.nodes.registerType("dyson-config", config);
}