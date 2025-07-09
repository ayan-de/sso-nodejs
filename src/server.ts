import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import session from 'express-session';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createHash } from 'crypto';
import { User, SSOApplication, SSOSession } from './types/sso';

dotenv.config();

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory user store (replace with database in production)
const users: Map<string, User> = new Map();
const ssoSessions: Map<string, SSOSession> = new Map();

// Registered applications that can use our SSO
const registeredApps: Map<string, SSOApplication> = new Map([
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
app.use(session({
    secret: process.env.SESSION_SECRET || 'secretkeyformyssonodejsapp',
    resave: false,
    saveUninitialized: false,
    store: process.env.NODE_ENV === 'production' ? undefined : new session.MemoryStore(),
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: '/auth/google/callback',
            passReqToCallback: true,
        },
        async (
            req: express.Request,
            accessToken: string,
            refreshToken: string,
            profile: Profile,
            done: any
        ) => {
            try {
                const email = profile.emails?.[0]?.value;
                if (!email) {
                    return done(new Error("Email not found"), null);
                }
                let user = Array.from(users.values()).find(
                    (user) => user.email === email
                );

                if (user) {
                    // Update existing user
                    user.name = profile.displayName;
                    user.picture = profile.photos?.[0]?.value;
                    users.set(user.id, user);
                    return done(null, user);
                }

                // Create new user
                const newUser: User = {
                    id: Date.now().toString(), // Use UUID in production
                    email: email,
                    name: profile.displayName,
                    picture: profile.photos?.[0]?.value,
                    googleId: profile.id,
                };

                users.set(newUser.id, newUser);
                return done(null, newUser);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

// Serialize user for session
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id: string, done) => {
    const user = users.get(id);
    done(null, user || null);
});

// Middleware to check if user is authenticated
const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
};

// JWT token generation
const generateJWT = (user: User): string => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name
        },
        process.env.JWT_SECRET || 'jwt-secret',
        { expiresIn: '24h' }
    );
};

// SSO Provider Routes

// 1. SSO Login Endpoint - Apps redirect users here
app.get('/sso/login', (req, res) => {
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

// 3. SSO Token Validation Endpoint
app.post('/sso/validate', (req, res) => {
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

// Helper Functions
function findActiveSession(req: express.Request): SSOSession | null {
    const sessionId = req.cookies?.sso_session;
    if (!sessionId) return null;

    const session = ssoSessions.get(sessionId);
    if (!session || session.expiresAt < new Date()) {
        return null;
    }

    return session;
}

function generateSSOToken(session: SSOSession, app: SSOApplication): string {
    return jwt.sign({
        sessionId: session.sessionId,
        userId: session.userId,
        email: session.email,
        name: session.name,
        appId: app.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(session.expiresAt.getTime() / 1000)
    }, app.secret);
}

function generateSessionId(): string {
    return createHash('sha256')
        .update(Math.random().toString() + Date.now().toString())
        .digest('hex');
}

function authenticateUser(email: string, password: string): any {
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
            <p>Welcome, ${(req.user as User).name}!</p>
            <img src="${(req.user as User).picture}" alt="Profile" width="50" height="50">
            <br>
            <a href="/profile">View Profile</a> | 
            <a href="/logout">Logout</a>
          ` :
            `
            <a href="/auth/google">Sign in with Google</a>
          `
        }
      </body>
    </html>
  `);
});

// Start OAuth flow
app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// OAuth callback
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        const { redirect_uri, state } = req.query;
        const user = req.user as User;

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

        if (typeof redirect_uri === 'string' && typeof state === 'string') {
            const app = Array.from(registeredApps.values()).find(a => a.redirectUrl === redirect_uri);
            if (app) {
                const token = generateSSOToken(session, app);
                return res.redirect(`${redirect_uri}?token=${token}&state=${state}`);
            }
        }

        res.redirect('/');
    }
);

// Protected route - user profile
app.get('/profile', isAuthenticated, (req, res) => {
    const user = req.user as User;
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwt-secret');
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ valid: false, error: 'Invalid token' });
    }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

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

//google oauth callback url is http://localhost:5000/auth/google/callback
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

export { app, SSOClient };
