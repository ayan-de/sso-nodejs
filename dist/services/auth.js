"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJWT = exports.isAuthenticated = void 0;
exports.authenticateUser = authenticateUser;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const store_1 = require("../store");
// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
};
exports.isAuthenticated = isAuthenticated;
// JWT token generation
const generateJWT = (user) => {
    return jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        name: user.name
    }, process.env.JWT_SECRET || 'jwt-secret', { expiresIn: '24h' });
};
exports.generateJWT = generateJWT;
function authenticateUser(email, password) {
    // Simplified authentication
    let user = Array.from(store_1.users.values()).find(u => u.email === email);
    if (!user) {
        user = { id: Date.now().toString(), email, name: 'John Doe' };
        store_1.users.set(user.id, user);
    }
    return user;
}
