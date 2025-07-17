import dotenv from 'dotenv';
import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { generateSSOToken, generateSessionId } from '../services/sso';
import { registeredApps, ssoSessions, users } from '../store';
import { SSOSession, User } from '../types/sso';

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
    async (req: express.Request, accessToken: string, refreshToken: string, profile: Profile, done: any) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('Email not found'), null);
        }
        let user: User | undefined = Array.from(users.values()).find((user) => user.email === email);

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
router.get('/auth/google', (req, res, next) => {
  // Get params from query
  const { app_id, redirect_uri, state } = req.query;
  // Encode all needed info into state param
  const stateObj = {
    app_id,
    redirect_uri,
    state: state || '',
  };
  const encodedState = Buffer.from(JSON.stringify(stateObj)).toString('base64');
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: encodedState,
  })(req, res, next);
});

// OAuth callback (Google redirects here after login)
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  // Decode state param
  let redirect_uri, app_id, orig_state;
  try {
    const stateParam = req.query.state as string;
    if (stateParam) {
      const decoded = JSON.parse(Buffer.from(stateParam, 'base64').toString('utf8'));
      redirect_uri = decoded.redirect_uri;
      app_id = decoded.app_id;
      orig_state = decoded.state;
    }
  } catch (e) {
    // fallback
  }
  const user = req.user as User;

  // Create SSO session
  const sessionId = generateSessionId();
  const session: SSOSession = {
    sessionId,
    userId: user.id,
    email: user.email,
    name: user.name,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  };

  //later to be stored in Redis
  ssoSessions.set(sessionId, session);

  // Set SSO session cookie
  res.cookie('sso_session', sessionId, {
    httpOnly: true,
    secure: false, // true in production
    maxAge: 24 * 60 * 60 * 1000,
  });

  if (typeof redirect_uri === 'string' && typeof app_id === 'string') {
    const app = registeredApps.get(app_id);
    if (app && app.redirectUrl === redirect_uri) {
      const token = generateSSOToken(session, app);
      return res.redirect(`${redirect_uri}?token=${token}&state=${orig_state || ''}`);
    }
  }

  res.redirect(process.env.FRONTEND_URL_1 || '/');
  // res.redirect('http://localhost:5173/')
});

export default router;
