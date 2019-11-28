
module.exports = function (RED: any) {
    function config(config) {
        RED.nodes.createNode(this, config);		
       
        this.username = config.username;
        this.password = config.password;

    }
  
    RED.nodes.registerType("dyson-config", config);
}