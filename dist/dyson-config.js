"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DysonPurelink_1 = require("./dysonpurelink/DysonPurelink");
module.exports = function (RED) {
    function config(config) {
        RED.nodes.createNode(this, config);
        this.username = config.username;
        this.password = config.password;
        this.country = config.country;
        this.config = this;
    }
    RED.httpAdmin.get("/dysonDevices/:id", function (req, res) {
        RED.log.debug("GET /dysonDevices");
        var nodeId = req.params.id;
        var config = RED.nodes.getNode(nodeId);
        var pureLink = new DysonPurelink_1.DysonPurelink(config.username, config.password, 'DE');
        pureLink.getDevices().then(function (devices) {
            if (!Array.isArray(devices) || devices.length === 0) {
                return;
            }
            var ret = [];
            for (var _i = 0, devices_1 = devices; _i < devices_1.length; _i++) {
                var device = devices_1[_i];
                ret.push(device._deviceInfo);
            }
            res.json(ret);
        }).catch(function (err) { return console.error(err); });
    });
    RED.nodes.registerType("dyson-config", config);
};

//# sourceMappingURL=dyson-config.js.map
