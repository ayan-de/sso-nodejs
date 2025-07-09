export interface User {
    id: string;
    email: string;
    name: string;
    picture?: string;
    googleId?: string;
}

export interface SSOApplication {
    id: string;
    name: string;
    redirectUrl: string;
    secret: string;
}

export interface SSOSession {
    sessionId: string;
    userId: string;
    email: string;
    name: string;
    createdAt: Date;
    expiresAt: Date;
}
