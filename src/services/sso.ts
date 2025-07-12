import express from 'express';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { SSOSession, SSOApplication } from '../types/sso';
import { ssoSessions } from '../store';

export function findActiveSession(req: express.Request): SSOSession | null {
    const sessionId = req.cookies?.sso_session;
    if (!sessionId) return null;

    const session = ssoSessions.get(sessionId);
    if (!session || session.expiresAt < new Date()) {
        return null;
    }

    return session;
}

export function generateSSOToken(session: SSOSession, app: SSOApplication): string {
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

export function generateSessionId(): string {
    return createHash('sha256')
        .update(Math.random().toString() + Date.now().toString())
        .digest('hex');
}
