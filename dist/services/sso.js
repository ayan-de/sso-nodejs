"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findActiveSession = findActiveSession;
exports.generateSSOToken = generateSSOToken;
exports.generateSessionId = generateSessionId;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const store_1 = require("../store");
function findActiveSession(req) {
    const sessionId = req.cookies?.sso_session;
    if (!sessionId)
        return null;
    const session = store_1.ssoSessions.get(sessionId);
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
