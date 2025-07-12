import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../types/sso';
import { users } from '../store';

// Middleware to check if user is authenticated
export const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
};

// JWT token generation
export const generateJWT = (user: User): string => {
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

export function authenticateUser(email: string, password: string): any {
    // Simplified authentication
    let user = Array.from(users.values()).find(u => u.email === email);
    if (!user) {
        user = { id: Date.now().toString(), email, name: 'John Doe' };
        users.set(user.id, user);
    }
    return user;
}
