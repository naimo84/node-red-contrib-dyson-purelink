import { Agent } from "https";
import { readFileSync } from "fs";
import axios, { AxiosRequestConfig, AxiosPromise } from 'axios';
import { existsSync, unlinkSync } from 'fs';
import { Red } from "node-red";

const util = require('util');
const fs = require('fs');
const readFileAsync = util.promisify(fs.readFile);

const API_PATH_USER_STATUS = "/v3/userregistration/email/userstatus"
const API_PATH_EMAIL_REQUEST = "/v3/userregistration/email/auth"
const API_PATH_EMAIL_VERIFY = "/v3/userregistration/email/verify"
const API_PATH_MOBILE_REQUEST = "/v3/userregistration/mobile/auth"
const API_PATH_MOBILE_VERIFY = "/v3/userregistration/mobile/verify"
const API_PATH_DEVICES = "/v2/provisioningservice/manifest"
const api = 'https://appapi.cp.dyson.com';

export class DysonCloud {
    auth: {
        account: string;
        password: string;
        challengeId: string;
        token: string;
    };
    cookieFile: string;
    node: any;
    RED: Red;

    constructor(...args) {
        this.cookieFile = "./dyson_cookie";
        if (args && args.length > 0) {
            this.RED = args[1];
            this.node = this.RED.nodes.getNode(args[0].id)
        }

        this.auth = {
            account: '',
            password: '',
            challengeId: '',
            token: ''
        };
        this.verify = this.verify.bind(this)
        this.authenticate = this.authenticate.bind(this)
    }

    async verify(email, password, otp) {
        try {

            this.auth = await readFileAsync(this.cookieFile, 'utf8').then(json => JSON.parse(json));

            if (!this.auth.token) {
                const instance = axios.create()
                var options: AxiosRequestConfig = {
                    headers: {
                        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 6.0; Android SDK built for x86_64 Build/MASTER)'
                    },
                    httpsAgent: new Agent({
                        ca: readFileSync("./dist/dysonpurelink/certs/digicert.crt"),
                        rejectUnauthorized: false
                    })
                }

                const info = await instance.post(`${api}${API_PATH_EMAIL_VERIFY}`, {
                    "email": email,
                    "password": password,
                    "challengeId": this.auth.challengeId,
                    "otpCode": otp,

                }, options)

                this.auth = info.data;

                try { fs.writeFileSync(this.cookieFile, JSON.stringify(info.data), 'utf8'); }
                catch (error) { console.log(error); }
                if (this.node) {
                    this.node.status({ fill: "green", shape: "dot", text: "otp code verified" })
                    setTimeout(() => this.node.status({ text: "" }), 10000)
                }
            }
        }
        catch (e) {
            unlinkSync(this.cookieFile)
            if (this.node) this.node.error(e)
            console.log(e);
        }
        return this.auth
    }

    async authenticate(email, country) {
        if (existsSync(this.cookieFile)) {
            unlinkSync(this.cookieFile)
        }
        if (!country) {
            country = 'US';
        }
        try {
            const instance = axios.create()
            var options: AxiosRequestConfig = {
                headers: {
                    'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 6.0; Android SDK built for x86_64 Build/MASTER)',

                },
                httpsAgent: new Agent({
                    ca: readFileSync("./dist/dysonpurelink/certs/digicert.crt"),
                    rejectUnauthorized: false
                }),
            }

            const userstatus = await instance.post(`${api}${API_PATH_USER_STATUS}?country=${country}`, {
                email: email
            }, options)

            if (userstatus.data?.accountStatus === "ACTIVE") {
                const info = await instance.post(`${api}${API_PATH_EMAIL_REQUEST}?country=${country}&culture=en-US`, {
                    email: email
                }, options)

                //@ts-ignore
                this.auth = {
                    challengeId: info.data?.challengeId,
                };
                try { fs.writeFileSync(this.cookieFile, JSON.stringify(this.auth), 'utf8'); }
                catch (error) { console.log(error); if (this.node) this.node.error(error) }
                if (this.node) this.node.status({ fill: "green", shape: "dot", text: "Wait for otp email" })
            }
        }
        catch (e) {
            unlinkSync(this.cookieFile)
            if (this.node) this.node.error(e)
            console.log(e);
        }

        return {
            auth: this.auth,
        }
    }

    async getCloudDevices() {
        if (existsSync(this.cookieFile)) {
            this.auth = await readFileAsync(this.cookieFile, 'utf8').then(json => JSON.parse(json));
            if (!this.auth.token) {
                return {
                    data: []
                };
            }
            const instance = axios.create()
            try {
                var options: AxiosRequestConfig = {
                    headers: {
                        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 6.0; Android SDK built for x86_64 Build/MASTER)',
                        'Authorization': `Bearer ${this.auth.token}`
                    },
                    httpsAgent: new Agent({
                        ca: readFileSync("./dist/dysonpurelink/certs/digicert.crt"),
                        rejectUnauthorized: false
                    }),

                }

                const info = await instance.get(`${api}${API_PATH_DEVICES}`, options)
                return info;
            }
            catch (e) {
                if (this.node) this.node.error(e)
                console.log(e);
            }
        }
        return {
            data: []
        };
    }
};

