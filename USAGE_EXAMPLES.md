# Usage Examples - @thisisayande/sso

This document shows how users will use the @thisisayande/sso package in their applications.

## Published Packages (3 total)

| Package | Install Command | Usage |
|---------|----------------|-------|
| `@thisisayande/sso` | `npm install @thisisayande/sso` | Standalone server + Express middleware |
| `@thisisayande/sso-client` | `npm install @thisisayande/sso-client` | Client library for apps |
| `@thisisayande/create-sso` | `npx @thisisayande/create-sso` | CLI setup tool |

**Note:** `@thisisayande/sso` bundles all internal packages (core, express adapter, storage, providers). You only need one install for the server!

---

## Option 1: Standalone SSO Server

### Installation

```bash
npm install @thisisayande/sso
# or
pnpm add @thisisayande/sso
# or
yarn add @thisisayande/sso
```

### Basic Usage

```typescript
import { createSSOServer } from '@thisisayande/sso';

const server = await createSSOServer({
  // Server configuration
  server: {
    port: 5000,
    baseUrl: 'https://sso.yourcompany.com',
    frontendUrl: 'https://app.yourcompany.com',
  },

  // JWT configuration (generate keys with: openssl genrsa -out private.pem 4096)
  jwt: {
    privateKey: process.env.JWT_PRIVATE_KEY!,
    publicKey: process.env.JWT_PUBLIC_KEY!,
    issuer: 'sso',
    audience: ['sso', 'your-apps'],
    expiresIn: '24h',
  },

  // Storage configuration
  storage: {
    type: 'redis',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
    },
  },

  // OAuth providers
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: 'profile email',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: 'read:user user:email',
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      scope: 'openid profile email',
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      scope: 'email public_profile',
    },
  },

  // Security configuration
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
    csrf: {
      enabled: true,
    },
    cors: {
      enabled: true,
      origins: ['https://app1.yourcompany.com', 'https://app2.yourcompany.com'],
      credentials: true,
    },
  },

  // Registered applications
  applications: [
    {
      id: 'app1',
      name: 'Dashboard',
      secret: process.env.APP1_SECRET!,
      redirectUrl: 'https://app1.yourcompany.com/auth/callback',
    },
    {
      id: 'app2',
      name: 'Blog',
      secret: process.env.APP2_SECRET!,
      redirectUrl: 'https://app2.yourcompany.com/auth/callback',
    },
  ],
});

console.log(`SSO Server running on port 5000`);
```

### With Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  sso-server:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - BASE_URL=https://sso.yourcompany.com
      - JWT_PRIVATE_KEY=${JWT_PRIVATE_KEY}
      - JWT_PUBLIC_KEY=${JWT_PUBLIC_KEY}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

---

## Option 2: Express Middleware Integration

### Installation

```bash
npm install @thisisayande/sso
# or
pnpm add @thisisayande/sso
```

### Basic Usage

```typescript
import express from 'express';
import { createSSOMiddleware, RedisSessionStore, RedisUserStore, RedisApplicationStore } from '@thisisayande/sso';
import { RS256TokenService, SessionService, AuthService } from '@thisisayande/sso';
import { GoogleProvider, GitHubProvider } from '@thisisayande/sso';

const app = express();

// Initialize stores (everything comes from @thisisayande/sso)
const sessionStore = new RedisSessionStore(redisClient);
const userStore = new RedisUserStore(redisClient);
const applicationStore = new RedisApplicationStore(redisClient);

// Initialize token service
const tokenService = new RS256TokenService({
  privateKey: process.env.JWT_PRIVATE_KEY!,
  publicKey: process.env.JWT_PUBLIC_KEY!,
  issuer: 'my-sso',
  audience: ['my-app'],
});

// Initialize core services
const sessionService = new SessionService(sessionStore, {
  ttl: 24 * 60 * 60 * 1000,
});

const authService = new AuthService(userStore, {
  passwordMinLength: 8,
});

// Initialize OAuth providers
const providers = new Map([
  ['google', new GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  })],
  ['github', new GitHubProvider({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  })],
]);

// Mount SSO middleware
app.use('/sso', createSSOMiddleware({
  sessionService,
  authService,
  tokenService,
  applicationStore,
  providers,
  baseUrl: 'https://sso.yourcompany.com',
}));

app.listen(3000);
```

const app = express();

// Initialize stores
const sessionStore = new RedisSessionStore(redisClient);
const userStore = new RedisUserStore(redisClient);
const applicationStore = new RedisApplicationStore(redisClient);

// Initialize token service with RS256
const tokenService = new RS256TokenService({
  privateKey: process.env.JWT_PRIVATE_KEY!,
  publicKey: process.env.JWT_PUBLIC_KEY!,
  issuer: 'my-sso',
  audience: ['my-app'],
});

// Initialize core services
const sessionService = new SessionService(sessionStore, {
  ttl: 24 * 60 * 60 * 1000, // 24 hours
});

const authService = new AuthService(userStore, {
  passwordMinLength: 8,
});

// Initialize OAuth providers
const providers = new Map([
  ['google', new GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  })],
  ['github', new GitHubProvider({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  })],
]);

// Mount SSO middleware
app.use('/sso', createSSOMiddleware({
  sessionService,
  authService,
  tokenService,
  applicationStore,
  providers,
  baseUrl: 'https://sso.yourcompany.com',
}));

// Your existing routes
app.get('/', (req, res) => {
  res.send('My App');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Protecting Routes with Middleware

```typescript
import { requireAuth } from '@thisisayande/sso';

// Protect specific routes
app.get('/api/profile', requireAuth(), (req, res) => {
  // req.user is available here
  res.json({ user: req.user });
});

// Protect a whole router
const apiRouter = express.Router();
apiRouter.use(requireAuth());

apiRouter.get('/data', (req, res) => {
  res.json({ data: 'protected' });
});

app.use('/api', apiRouter);
```

---

## Option 3: Client Library (For Your Applications)

### Installation

```bash
npm install @thisisayande/sso-client
# or
pnpm add @thisisayande/sso-client
```

### React Example

```tsx
import { SSOClient } from '@thisisayande/sso-client';
import { useEffect, useState } from 'react';

const ssoClient = new SSOClient({
  appId: process.env.NEXT_PUBLIC_SSO_APP_ID!,
  appSecret: process.env.SSO_APP_SECRET!, // Server-side only
  ssoUrl: process.env.NEXT_PUBLIC_SSO_URL!,
});

function LoginButton() {
  const handleLogin = () => {
    const loginUrl = ssoClient.getLoginUrl({
      redirectUri: `${window.location.origin}/auth/callback`,
      state: crypto.randomUUID(),
      provider: 'google', // Optional: google, github, microsoft, facebook
    });
    window.location.href = loginUrl;
  };

  return <button onClick={handleLogin}>Login with SSO</button>;
}

// Auth callback page
function AuthCallback() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const state = urlParams.get('state');

    if (token) {
      // Validate token with your backend
      fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            // Store user session
            localStorage.setItem('user', JSON.stringify(data.user));
            // Redirect to dashboard
            window.location.href = '/dashboard';
          }
        });
    }
  }, []);

  return <div>Authenticating...</div>;
}

export default function App() {
  return (
    <div>
      <h1>My App</h1>
      <LoginButton />
    </div>
  );
}
```

### Next.js Example

```typescript
// app/login/page.tsx
'use client';

import { SSOClient } from '@thisisayande/sso-client';

const ssoClient = new SSOClient({
  appId: process.env.NEXT_PUBLIC_SSO_APP_ID!,
  ssoUrl: process.env.NEXT_PUBLIC_SSO_URL!,
});

export default function LoginPage() {
  const handleLogin = (provider: string) => {
    const loginUrl = ssoClient.getLoginUrl({
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      state: crypto.randomUUID(),
      provider,
    });
    window.location.href = loginUrl;
  };

  return (
    <div>
      <h1>Login</h1>
      <button onClick={() => handleLogin('google')}>Login with Google</button>
      <button onClick={() => handleLogin('github')}>Login with GitHub</button>
    </div>
  );
}

// app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';

export default function CallbackPage() {
  useEffect(() => {
    const exchangeToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (code) {
        // Exchange code for tokens with your backend
        const response = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
        });

        const data = await response.json();
        if (data.accessToken) {
          // Store tokens
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          window.location.href = '/dashboard';
        }
      }
    };

    exchangeToken();
  }, []);

  return <div>Processing login...</div>;
}
```

### Backend Token Validation (Node.js/Express)

```typescript
import express from 'express';
import { SSOClient } from '@thisisayande/sso-client';

const ssoClient = new SSOClient({
  appId: process.env.SSO_APP_ID!,
  appSecret: process.env.SSO_APP_SECRET!,
  ssoUrl: process.env.SSO_URL!,
});

const app = express();

app.post('/api/auth/verify', async (req, res) => {
  const { token } = req.body;

  try {
    const result = await ssoClient.validateToken(token);

    if (result.valid) {
      // Create your own session/token for the user
      const sessionToken = await createLocalSession(result.user);

      res.json({
        valid: true,
        user: result.user,
        token: sessionToken,
      });
    } else {
      res.status(401).json({ valid: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Token validation failed' });
  }
});

app.post('/api/auth/callback', async (req, res) => {
  const { code, state } = req.body;

  try {
    const result = await ssoClient.exchangeCodeForTokens(code, state);

    // Validate the SSO token
    const validation = await ssoClient.validateToken(result.ssoToken);

    if (validation.valid) {
      // Create local user session
      const localToken = await createLocalSession(validation.user);

      res.json({
        accessToken: localToken,
        refreshToken: result.refreshToken,
        user: validation.user,
      });
    } else {
      res.status(401).json({ error: 'Invalid SSO token' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const result = await ssoClient.refreshToken(refreshToken);

    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

app.listen(3001, () => {
  console.log('App server running on port 3001');
});
```

---

## Option 4: Custom Storage Provider

### Creating a Custom Session Store

```typescript
import { ISessionStore, SSOSession } from '@thisisayande/sso';

export class CustomSessionStore implements ISessionStore {
  constructor(private dataSource: YourDataSource) {}

  async create(session: SSOSession): Promise<string> {
    const sessionId = generateId();
    await this.dataSource.sessions.create({
      id: sessionId,
      userId: session.userId,
      data: session.data,
      expiresAt: new Date(Date.now() + session.ttl),
    });
    return sessionId;
  }

  async get(sessionId: string): Promise<SSOSession | null> {
    const record = await this.dataSource.sessions.findOne({ id: sessionId });
    if (!record || record.expiresAt < new Date()) {
      return null;
    }
    return {
      sessionId: record.id,
      userId: record.userId,
      data: record.data,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    };
  }

  async update(sessionId: string, data: Partial<SSOSession>): Promise<void> {
    await this.dataSource.sessions.update(
      { id: sessionId },
      { $set: data }
    );
  }

  async delete(sessionId: string): Promise<void> {
    await this.dataSource.sessions.delete({ id: sessionId });
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.dataSource.sessions.deleteMany({ userId });
    return result.deletedCount;
  }

  async cleanup(): Promise<number> {
    const result = await this.dataSource.sessions.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    return result.deletedCount;
  }
}
```

### Using Custom Store

```typescript
import { createSSOServer } from '@thisisayande/sso';
import { CustomSessionStore } from './stores/custom-session';

const server = await createSSOServer({
  // ... other config
  storage: {
    type: 'custom',
    sessionStore: new CustomSessionStore(yourDataSource),
    userStore: new CustomUserStore(yourDataSource),
    applicationStore: new CustomApplicationStore(yourDataSource),
  },
});
```

---

## Option 5: Custom OAuth Provider

```typescript
import { OAuth2Provider } from '@thisisayande/sso';

export class CustomAuthProvider extends OAuth2Provider {
  name = 'custom';

  authorizationEndpoint = 'https://auth.example.com/oauth/authorize';
  tokenEndpoint = 'https://auth.example.com/oauth/token';
  userInfoEndpoint = 'https://auth.example.com/api/user';

  constructor(config: OAuth2Config) {
    super(config);
  }

  // Custom user profile mapping
  async getUserProfile(accessToken: string): Promise<UserProfile> {
    const response = await fetch(this.userInfoEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();

    return {
      id: data.id,
      email: data.email_address,
      name: `${data.first_name} ${data.last_name}`,
      picture: data.avatar_url,
      raw: data,
    };
  }
}

// Register custom provider
const server = await createSSOServer({
  // ... other config
  providers: {
    custom: new CustomAuthProvider({
      clientId: process.env.CUSTOM_CLIENT_ID!,
      clientSecret: process.env.CUSTOM_CLIENT_SECRET!,
      scope: 'read:user read:email',
    }),
  },
});
```

---

## Environment Variables Template

```env
# .env

# SSO Server Configuration
SSO_BASE_URL=https://sso.yourcompany.com
SSO_PORT=5000
NODE_ENV=production

# JWT Keys (Generate with: openssl genrsa -out private.pem 4096)
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
JWT_ISSUER=sso
JWT_AUDIENCE=sso

# Storage (choose one)
STORAGE_TYPE=redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
CSRF_ENABLED=true

# Application Registration (for standalone server)
APP1_ID=app1
APP1_SECRET=your-app1-secret
APP1_REDIRECT_URL=https://app1.yourcompany.com/auth/callback

APP2_ID=app2
APP2_SECRET=your-app2-secret
APP2_REDIRECT_URL=https://app2.yourcompany.com/auth/callback
```

---

## Quick Start Example

### 1. Start the SSO Server

```bash
# Generate RSA keys
openssl genrsa -out private.pem 4096
openssl rsa -in private.pem -pubout -out public.pem

# Set up environment
cp .env.example .env
# Edit .env with your values

# Start server
npm start
```

### 2. Register Your App

```bash
# Via API (or use configuration file)
curl -X POST http://localhost:5000/api/applications \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-app",
    "name": "My Application",
    "secret": "super-secret-key",
    "redirectUrl": "https://myapp.com/auth/callback"
  }'
```

### 3. Add Login to Your App

```typescript
import { SSOClient } from '@thisisayande/sso-client';

const sso = new SSOClient({
  appId: 'my-app',
  appSecret: 'super-secret-key',
  ssoUrl: 'https://sso.yourcompany.com',
});

// Redirect user to login
const loginUrl = sso.getLoginUrl({
  redirectUri: 'https://myapp.com/auth/callback',
  state: generateRandomString(),
});
window.location.href = loginUrl;
```

### 4. Handle Callback

```typescript
// On your callback route
const token = urlParams.get('token');
const validation = await sso.validateToken(token);

if (validation.valid) {
  // User is authenticated!
  console.log('User:', validation.user);
}
```

---

## TypeScript Support

All packages are written in TypeScript with full type definitions:

```typescript
import {
  SSOClient,
  type TokenValidationResult,
  type UserProfile,
  type OAuth2Tokens,
} from '@thisisayande/sso-client';

const client: SSOClient = new SSOClient({ /* ... */ });
const result: TokenValidationResult = await client.validateToken(token);
const user: UserProfile = result.user;
```
