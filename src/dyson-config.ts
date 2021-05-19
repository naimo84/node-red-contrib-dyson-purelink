import { DysonCloud } from "./dysonpurelink/dysonCloud";
import DysonPurelink from "./dysonpurelink/DysonPurelink";

module.exports = function (RED: any) {
    function config(config) {
        RED.nodes.createNode(this, config);

        this.username = config.username;
        this.password = config.password;
        this.country = config.country;
        this.config = this;
    }

    RED.httpAdmin.get("/dysonDevices/:id", async (req, res) => {
        RED.log.debug("GET /dysonDevices");
        const nodeId = req.params.id;
        const config = RED.nodes.getNode(nodeId);

        try {
            const pureLink = new DysonPurelink(config.username, config.password, config.country);
            const devices = await pureLink.getDevices();

            if (!Array.isArray(devices)) {
                return [];
            }

            const deviceInfo = devices.map(d => d._deviceInfo);
            res.json(deviceInfo);
        } catch (e) {
            res.json(e);

            console.error(e);
        }
    });

    RED.httpAdmin.post("/dyson/authenticate", async (req, res) => {
        const username = req.body.username;
        try {
            let dysonCloud = new DysonCloud();
            let auth = await dysonCloud.authenticate(req.body.username, req.body.country);
            res.json(auth);
        } catch (e) {
            res.json(e);
            console.error(e);
        }
    });


    RED.httpAdmin.post("/dyson/verify", async (req, res) => {
        const auth = req.body.username;
        try {
            let dysonCloud = new DysonCloud();
            let auth = await dysonCloud.verify(req.body.username,req.body.password,req.body.otp);
            res.json(req.body);
        } catch (e) {
            res.json(e);
            console.error(e);
        }
    });
    RED.nodes.registerType("dyson-config", config);
}