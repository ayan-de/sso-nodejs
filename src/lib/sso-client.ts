class SSOClient {
    constructor(
        private appId: string,
        private appSecret: string,
        private ssoProviderUrl: string
    ) {}
    
    // Redirect user to SSO provider
    initiateLogin(redirectUri: string, state?: string): string {
        const params = new URLSearchParams({
            app_id: this.appId,
            redirect_uri: redirectUri,
            state: state || ''
        });
        
        return `${this.ssoProviderUrl}/sso/login?${params}`;
    }
    
    // Validate token received from SSO provider
    async validateToken(token: string): Promise<any> {
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

export { SSOClient };
