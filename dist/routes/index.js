"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const google_1 = __importDefault(require("../auth/google"));
const auth_1 = require("../services/auth");
const router = express_1.default.Router();
router.get('/', (req, res) => {
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
router.use(google_1.default);
// Protected route - user profile
router.get('/profile', auth_1.isAuthenticated, (req, res) => {
    const user = req.user;
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
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'jwt-secret');
        res.json({ valid: true, user: decoded });
    }
    catch (error) {
        res.status(401).json({ valid: false, error: 'Invalid token' });
    }
});
exports.default = router;
