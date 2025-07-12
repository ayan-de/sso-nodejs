"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registeredApps = exports.ssoSessions = exports.users = void 0;
// In-memory user store (replace with database in production)
exports.users = new Map();
exports.ssoSessions = new Map();
// Registered applications that can use our SSO
exports.registeredApps = new Map([
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
