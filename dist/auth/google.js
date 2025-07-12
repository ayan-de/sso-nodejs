"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const store_1 = require("../store");
const sso_1 = require("../services/sso");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = express_1.default.Router();
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
        let user = Array.from(store_1.users.values()).find((user) => user.email === email);
        if (user) {
            // Update existing user
            user.name = profile.displayName;
            user.picture = profile.photos?.[0]?.value;
            store_1.users.set(user.id, user);
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
        store_1.users.set(newUser.id, newUser);
        return done(null, newUser);
    }
    catch (error) {
        return done(error, null);
    }
}));
// Start OAuth flow
router.get('/auth/google', passport_1.default.authenticate('google', {
    scope: ['profile', 'email']
}));
// OAuth callback
router.get('/auth/google/callback', passport_1.default.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    const { redirect_uri, state } = req.query;
    const user = req.user;
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
    if (typeof redirect_uri === 'string' && typeof state === 'string') {
        const app = Array.from(store_1.registeredApps.values()).find((a) => a.redirectUrl === redirect_uri);
        if (app) {
            const token = (0, sso_1.generateSSOToken)(session, app);
            return res.redirect(`${redirect_uri}?token=${token}&state=${state}`);
        }
    }
    res.redirect('/');
});
exports.default = router;
