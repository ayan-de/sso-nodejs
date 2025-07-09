"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSOClient = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const express_session_1 = __importDefault(require("express-session"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const crypto_1 = require("crypto");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// In-memory user store (replace with database in production)
const users = new Map();
const ssoSessions = new Map();
// Registered applications that can use our SSO
const registeredApps = new Map([
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
// Session configuration
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'secretkeyformyssonodejsapp',
    resave: false,
    saveUninitialized: false,
    store: process.env.NODE_ENV === 'production' ? undefined : new express_session_1.default.MemoryStore(),
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
// Initialize Passport
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Google OAuth Strategy
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    passReqToCallback: true,
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            return done(new Error("Email not found"), null);
        }
        let user = Array.from(users.values()).find((user) => user.email === email);
        if (user) {
            // Update existing user
            user.name = profile.displayName;
            user.picture = profile.photos?.[0]?.value;
            users.set(user.id, user);
            return done(null, user);
        }
        // Create new user
        const newUser = {
            id: Date.now().toString(), // Use UUID in production
            email: email,
            name: profile.displayName,
            picture: profile.photos?.[0]?.value,
            googleId: profile.id,
        };
        users.set(newUser.id, newUser);
        return done(null, newUser);
    }
    catch (error) {
        return done(error, null);
    }
}));
// Serialize user for session
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
// Deserialize user from session
passport_1.default.deserializeUser((id, done) => {
    const user = users.get(id);
    done(null, user || null);
});
// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
};
// JWT token generation
const generateJWT = (user) => {
    return jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        name: user.name
    }, process.env.JWT_SECRET || 'jwt-secret', { expiresIn: '24h' });
};
// SSO Provider Routes
// 1. SSO Login Endpoint - Apps redirect users here
app.get('/sso/login', (req, res) => {
    const { app_id, redirect_uri, state } = req.query;
    const app = registeredApps.get(app_id);
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
// 2. SSO Authentication Handler
app.post('/sso/authenticate', (req, res) => {
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
    const session = {
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
// 3. SSO Token Validation Endpoint
app.post('/sso/validate', (req, res) => {
    const { token, app_id } = req.body;
    const app = registeredApps.get(app_id);
    if (!app) {
        return res.status(400).json({ error: 'Invalid application' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, app.secret);
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
    }
    catch (error) {
        res.status(401).json({ valid: false, error: 'Invalid token' });
    }
});
// Helper Functions
function findActiveSession(req) {
    const sessionId = req.cookies?.sso_session;
    if (!sessionId)
        return null;
    const session = ssoSessions.get(sessionId);
    if (!session || session.expiresAt < new Date()) {
        return null;
    }
    return session;
}
function generateSSOToken(session, app) {
    return jsonwebtoken_1.default.sign({
        sessionId: session.sessionId,
        userId: session.userId,
        email: session.email,
        name: session.name,
        appId: app.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(session.expiresAt.getTime() / 1000)
    }, app.secret);
}
function generateSessionId() {
    return (0, crypto_1.createHash)('sha256')
        .update(Math.random().toString() + Date.now().toString())
        .digest('hex');
}
function authenticateUser(email, password) {
    // Simplified authentication
    let user = Array.from(users.values()).find(u => u.email === email);
    if (!user) {
        user = { id: Date.now().toString(), email, name: 'John Doe' };
        users.set(user.id, user);
    }
    return user;
}
// Routes
app.get('/', (req, res) => {
    res.send(`
    <html>
      <body>
        <h1>Google OAuth SSO Demo</h1>
        ${req.isAuthenticated() ?
        `
            <p>Welcome, ${req.user.name}!</p>
            <img src="${req.user.picture}" alt="Profile" width="50" height="50">
            <br>
            <a href="/profile">View Profile</a> | 
            <a href="/logout">Logout</a>
          ` :
        `
            <a href="/auth/google">Sign in with Google</a>
          `}
      </body>
    </html>
  `);
});
// Start OAuth flow
app.get('/auth/google', passport_1.default.authenticate('google', {
    scope: ['profile', 'email']
}));
// OAuth callback
app.get('/auth/google/callback', passport_1.default.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    const { redirect_uri, state } = req.query;
    const user = req.user;
    // Create SSO session
    const sessionId = generateSessionId();
    const session = {
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
    if (typeof redirect_uri === 'string' && typeof state === 'string') {
        const app = Array.from(registeredApps.values()).find(a => a.redirectUrl === redirect_uri);
        if (app) {
            const token = generateSSOToken(session, app);
            return res.redirect(`${redirect_uri}?token=${token}&state=${state}`);
        }
    }
    res.redirect('/');
});
// Protected route - user profile
app.get('/profile', isAuthenticated, (req, res) => {
    const user = req.user;
    res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
    });
});
// Logout
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.clearCookie('sso_session');
        res.clearCookie('jwt');
        res.redirect('/');
    });
});
// API endpoint to verify JWT token
app.get('/api/verify', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '') ||
        req.cookies?.jwt;
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'jwt-secret');
        res.json({ valid: true, user: decoded });
    }
    catch (error) {
        res.status(401).json({ valid: false, error: 'Invalid token' });
    }
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
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
//google oauth callback url is http://localhost:5000/auth/google/callback
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
