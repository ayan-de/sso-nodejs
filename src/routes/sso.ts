import express from 'express';
import jwt from 'jsonwebtoken';
import { registeredApps, ssoSessions } from '../store';
import { findActiveSession, generateSSOToken, generateSessionId } from '../services/sso';
import { authenticateUser } from '../services/auth';
import { SSOSession } from '../types/sso';

const router = express.Router();

// 1. SSO Login Endpoint - Apps redirect users here /sso/login
router.get('/login', (req, res) => {
    const { app_id, redirect_uri, state } = req.query;

    const app = registeredApps.get(app_id as string);
    if (!app) {
        return res.status(400).json({ error: 'Invalid application' });
    }

    // Check if user already has an active SSO session
    const existingSession = findActiveSession(req);
    if (existingSession) {
        // User is already logged in - generate token and redirect
        const token = generateSSOToken(existingSession, app);
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

// 2. SSO Authentication Handler  /sso/authenticate
router.post('/authenticate', (req, res) => {
    const { email, password, app_id, redirect_uri, state } = req.body;

    // Validate credentials (simplified)
    const user = authenticateUser(email, password);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const app = registeredApps.get(app_id);
    if (!app) {
        return res.status(400).json({ error: 'Invalid application' });
    }

    // Create SSO session
    const sessionId = generateSessionId();
    const session: SSOSession = {
        sessionId,
        userId: user.id,
        email: user.email,
        name: user.name,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    ssoSessions.set(sessionId, session);

    // Set SSO session cookie
    res.cookie('sso_session', sessionId, {
        httpOnly: true,
        secure: false, // true in production
        maxAge: 24 * 60 * 60 * 1000,
    });

    // Generate token for the requesting app
    const token = generateSSOToken(session, app);

    // Redirect back to application
    res.redirect(`${redirect_uri}?token=${token}&state=${state}`);
});

// 3. SSO Token Validation Endpoint /sso/validate
router.post('/validate', (req, res) => {
    const { token, app_id } = req.body;

    const app = registeredApps.get(app_id);
    if (!app) {
        return res.status(400).json({ error: 'Invalid application' });
    }

    try {
        const decoded = jwt.verify(token, app.secret) as any;
        const session = ssoSessions.get(decoded.sessionId);

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
    } catch (error) {
        res.status(401).json({ valid: false, error: 'Invalid token' });
    }
});

export default router;
