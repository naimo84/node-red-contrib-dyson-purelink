import { get, post } from 'request-promise-native';

export class DysonCloud {
    api: string;
    auth: {
        account: string;
        password: string;
    };

    constructor() {
        this.api = 'https://api.cp.dyson.com';
        this.auth = {
            account: '',
            password: ''
        };
    }

    async authenticate(email, password, country) {
        if (!country) {
            country = 'US';
        }

        var options = {
            url: `${this.api}/v1/userregistration/authenticate?country=${country}`,
            method: 'post',
            body: {
                Email: email,
                Password: password
            },
            agentOptions: {
                rejectUnauthorized: false
            },
            json: true
        }

        const info = await post(options);
        this.auth = {
            account: info.Account,
            password: info.Password
        };
        return this.auth;
    }

    getCloudDevices() {
        var options = {
            url: `${this.api}/v2/provisioningservice/manifest`,
            method: 'get',
            auth: {
                username: this.auth.account,
                password: this.auth.password,
            },
            agentOptions: {
                rejectUnauthorized: false
            },
            json: true
        }
        return get(options);
    }
};

