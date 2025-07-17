import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import passport from './config/passport';
import { SSOClient } from './lib/sso-client';
import mainRoutes from './routes/index';
import ssoRoutes from './routes/sso';
import { ssoSessions } from './store';

const app = express();

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

dotenv.config();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secretkeyformyssonodejsapp',
    resave: false,
    saveUninitialized: false,
    store: process.env.NODE_ENV === 'production' ? undefined : new session.MemoryStore(),
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware to restore req.user from sso_session cookie
app.use((req, res, next) => {
  if (!req.user && req.cookies && req.cookies.sso_session) {
    const session = ssoSessions.get(req.cookies.sso_session);
    if (session) {
      req.user = {
        id: session.userId,
        email: session.email,
        name: session.name,
      };
    }
  }
  next();
});

// Routes
app.use('/sso', ssoRoutes);
app.use('/', mainRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { app, SSOClient };
