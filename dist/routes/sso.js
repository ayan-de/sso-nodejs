"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const store_1 = require("../store");
const sso_1 = require("../services/sso");
const auth_1 = require("../services/auth");
const router = express_1.default.Router();
// 1. SSO Login Endpoint - Apps redirect users here
router.get('/login', (req, res) => {
    const { app_id, redirect_uri, state } = req.query;
    const app = store_1.registeredApps.get(app_id);
    if (!app) {
        return res.status(400).json({ error: 'Invalid application' });
    }
    // Check if user already has an active SSO session
    const existingSession = (0, sso_1.findActiveSession)(req);
    if (existingSession) {
        // User is already logged in - generate token and redirect
        const token = (0, sso_1.generateSSOToken)(existingSession, app);
        return res.redirect(`${redirect_uri}?token=${token}&state=${state}`);
    }
    // Show login form
    res.send(`
        <html>
            <body>
                <h1>SSO Login</h1>
                <p>Login to access ${app.name}</p>
                <form method="post" action="/sso/authenticate">
                    <input type="hidden" name="app_id" value="${app_id}">
                    <input type="hidden" name="redirect_uri" value="${redirect_uri}">
                    <input type="hidden" name="state" value="${state}">
                    <div>
                        <label>Email:</label>
                        <input type="email" name="email" required>
                    </div>
                    <div>
                        <label>Password:</label>
                        <input type="password" name="password" required>
                    </div>
                    <button type="submit">Login</button>
                </form>
                
                <!-- Or integrate with Google OAuth -->
                <hr>
                <a href="/auth/google?app_id=${app_id}&redirect_uri=${redirect_uri}&state=${state}">
                    Login with Google
                </a>
            </body>
        </html>
    `);
});
// 2. SSO Authentication Handler
router.post('/authenticate', (req, res) => {
    const { email, password, app_id, redirect_uri, state } = req.body;
    // Validate credentials (simplified)
    const user = (0, auth_1.authenticateUser)(email, password);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const app = store_1.registeredApps.get(app_id);
    if (!app) {
        return res.status(400).json({ error: 'Invalid application' });
    }
    // Create SSO session
    const sessionId = (0, sso_1.generateSessionId)();
    const session = {
        sessionId,
        userId: user.id,
        email: user.email,
        name: user.name,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
    store_1.ssoSessions.set(sessionId, session);
    // Set SSO session cookie
    res.cookie('sso_session', sessionId, {
        httpOnly: true,
        secure: false, // true in production
        maxAge: 24 * 60 * 60 * 1000,
    });
    // Generate token for the requesting app
    const token = (0, sso_1.generateSSOToken)(session, app);
    // Redirect back to application
    res.redirect(`${redirect_uri}?token=${token}&state=${state}`);
});
// 3. SSO Token Validation Endpoint
router.post('/validate', (req, res) => {
    const { token, app_id } = req.body;
    const app = store_1.registeredApps.get(app_id);
    if (!app) {
        return res.status(400).json({ error: 'Invalid application' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, app.secret);
        const session = store_1.ssoSessions.get(decoded.sessionId);
        if (!session || session.expiresAt < new Date()) {
            return res.status(401).json({ error: 'Session expired' });
        }
        res.json({
            valid: true,
            user: {
                id: session.userId,
                email: session.email,
                name: session.name
            }
        });
    }
    catch (error) {
        res.status(401).json({ valid: false, error: 'Invalid token' });
    }
});
exports.default = router;
