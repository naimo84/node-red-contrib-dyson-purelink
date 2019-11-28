"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var request = require('request-promise-native');
var DysonCloud = /** @class */ (function () {
    function DysonCloud() {
        this.api = 'https://api.cp.dyson.com';
        this.auth = {};
    }
    DysonCloud.prototype.authenticate = function (email, password, country) {
        var _this = this;
        if (!country) {
            country = 'US';
        }
        var options = {
            url: this.api + "/v1/userregistration/authenticate?country=" + country,
            method: 'post',
            body: {
                Email: email,
                Password: password
            },
            agentOptions: {
                rejectUnauthorized: false
            },
            json: true
        };
        return request(options).then(function (info) {
            _this.auth = {
                account: info.Account,
                password: info.Password
            };
            return _this.auth;
        });
    };
    DysonCloud.prototype.logout = function () {
        this.auth = {};
    };
    DysonCloud.prototype.getCloudDevices = function () {
        var options = {
            url: this.api + "/v2/provisioningservice/manifest",
            method: 'get',
            auth: {
                username: this.auth.account,
                password: this.auth.password,
            },
            agentOptions: {
                rejectUnauthorized: false
            },
            json: true
        };
        return request(options);
    };
    return DysonCloud;
}());
exports.DysonCloud = DysonCloud;
;
