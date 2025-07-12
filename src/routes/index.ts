import express from 'express';
import jwt from 'jsonwebtoken';
import googleAuthRouter from '../auth/google';
import { isAuthenticated } from '../services/auth';
import { User } from '../types/sso';

const router = express.Router();

router.get('/', (req, res) => {
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

router.use(googleAuthRouter);

// Protected route - user profile
router.get('/profile', isAuthenticated, (req, res) => {
    const user = req.user as User;
    res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
    });
});

// Logout
router.get('/logout', (req, res) => {
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
router.get('/api/verify', (req, res) => {
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

export default router;
