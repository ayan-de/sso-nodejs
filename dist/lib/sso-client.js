"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSOClient = void 0;
class SSOClient {
    appId;
    appSecret;
    ssoProviderUrl;
    constructor(appId, appSecret, ssoProviderUrl) {
        this.appId = appId;
        this.appSecret = appSecret;
        this.ssoProviderUrl = ssoProviderUrl;
    }
    // Redirect user to SSO provider
    initiateLogin(redirectUri, state) {
        const params = new URLSearchParams({
            app_id: this.appId,
            redirect_uri: redirectUri,
            state: state || ''
        });
        return `${this.ssoProviderUrl}/sso/login?${params}`;
    }
    // Validate token received from SSO provider
    async validateToken(token) {
        const response = await fetch(`${this.ssoProviderUrl}/sso/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token,
                app_id: this.appId
            })
        });
        return response.json();
    }
}
exports.SSOClient = SSOClient;
