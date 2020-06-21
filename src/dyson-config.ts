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

        const pureLink = new DysonPurelink(config.username, config.password,  config.country);

        try {
            const devices = await pureLink.getDevices();

            if (!Array.isArray(devices)) {
                return [];
            }

            const deviceInfo = devices.map(d => d._deviceInfo);
            res.json(deviceInfo);
        } catch(e) {
            console.error(e);
        }
    });

    RED.nodes.registerType("dyson-config", config);
}