import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { User, SSOSession, SSOApplication } from '../types/sso';
import { users, ssoSessions, registeredApps } from '../store';
import { generateSSOToken, generateSessionId } from '../services/sso';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

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
                let user: User | undefined = Array.from(users.values()).find(
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

// Start OAuth flow
// It redirects the user to Google's login page, asking for email and profile access.
router.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// OAuth callback (Google redirects here after login)
router.get('/auth/google/callback',
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

        //later to be stored in Redis
        ssoSessions.set(sessionId, session);

        // Set SSO session cookie
        res.cookie('sso_session', sessionId, {
            httpOnly: true,
            secure: false, // true in production
            maxAge: 24 * 60 * 60 * 1000,
        });

        if (typeof redirect_uri === 'string' && typeof state === 'string') {
            const app = Array.from(registeredApps.values()).find((a) => a.redirectUrl === redirect_uri);
            if (app) {
                const token = generateSSOToken(session, app);
                return res.redirect(`${redirect_uri}?token=${token}&state=${state}`);
            }
        }

        res.redirect(process.env.FRONTEND_URL_1 || '/');
        // res.redirect('http://localhost:5173/')
    }
);

export default router;
