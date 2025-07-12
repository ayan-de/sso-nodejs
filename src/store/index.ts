import { User, SSOApplication, SSOSession } from '../types/sso';

// In-memory user store (replace with database in production)
export const users: Map<string, User> = new Map();
export const ssoSessions: Map<string, SSOSession> = new Map();

// Registered applications that can use our SSO
export const registeredApps: Map<string, SSOApplication> = new Map([
    ['app1', {
        id: 'app1',
        name: 'Blog Application',
        redirectUrl: 'http://localhost:3001/auth/callback',
        secret: 'app1-secret'
    }],
    ['app2', {
        id: 'app2',
        name: 'Dashboard Application',
        redirectUrl: 'http://localhost:3002/auth/callback',
        secret: 'app2-secret'
    }]
]);
