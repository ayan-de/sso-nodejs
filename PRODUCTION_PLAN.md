# Production-Ready SSO npm Package Implementation Plan

## Context

The current SSO implementation at `/home/ayan-de/Projects/sso-nodejs` is a working proof-of-concept with significant production-readiness gaps. The goal is to transform it into a robust, scalable npm package that users can install, configure, and deploy with minimal setup.

**Current Issues:**
- In-memory storage (Maps) - single-server limitation, data lost on restart
- Hardcoded secrets and configuration
- HS256 JWT instead of RS256 (asymmetric encryption)
- No security middleware (helmet, rate limiting, CSRF)
- No proper error handling or logging
- No test suite
- Framework-coupled to Express only
- Single auth provider (Google)

**Target Package Capabilities:**
1. Framework-agnostic core with adapters
2. Multiple storage: Redis, PostgreSQL, MongoDB, in-memory
3. All major OAuth providers: Google, GitHub, Microsoft, Facebook, etc.
4. Both standalone server and middleware/library options
5. RS256 JWT with key rotation
6. Comprehensive security defaults
7. Full test coverage
8. Interactive CLI setup tool (`npx @thisisayande/create-sso`)
9. Template-based code generation for frameworks
10. Environment variable management and validation

---

## Implementation Timeline: 14 Weeks

| Phase | Week | Focus |
|-------|-------|-------|
| 1 | Week 1 | Project Setup & Core Interfaces |
| 2 | Week 2 | Core Services (Token, Session, Auth) |
| 3 | Week 3 | Storage Adapters |
| 4 | Week 4 | OAuth Provider System |
| 5 | Week 5 | Express Adapter |
| 6 | Week 6 | Client Library |
| 7 | Week 7 | CLI Tool & Templates |
| 8 | Week 8 | Configuration & Validation |
| 9 | Week 9 | Security & Hardening |
| 10-11 | Weeks 10-11 | Testing Suite |
| 12 | Week 12 | Documentation |
| 13 | Week 13 | CI/CD & Publishing |
| 14 | Week 14 | Polish & Optimization |

---

## Architecture Overview

### Monorepo Structure

```
sso-nodejs/
├── packages/
│   ├── core/                 # Framework-agnostic core
│   │   ├── src/
│   │   │   ├── interfaces/   # IStore, IAuthProvider, ITokenService
│   │   │   ├── services/     # SessionService, AuthService, TokenService
│   │   │   ├── crypto/       # RSA key generation, signing
│   │   │   ├── config/      # Config schema, env loader
│   │   │   └── types/        # TypeScript types
│   │   └── package.json     # @thisisayande/sso-core
│   ├── express-adapter/      # Express integration
│   │   ├── src/
│   │   │   ├── middleware.ts
│   │   │   ├── routes.ts
│   │   │   └── server.ts    # Standalone server
│   │   └── package.json     # @thisisayande/sso-express
│   ├── storage/              # Storage adapters
│   │   ├── src/
│   │   │   ├── redis.ts
│   │   │   ├── postgres.ts
│   │   │   ├── mongodb.ts
│   │   │   └── memory.ts
│   │   └── package.json     # @thisisayande/sso-storage
│   ├── providers/            # OAuth providers
│   │   ├── src/
│   │   │   ├── base.ts
│   │   │   ├── google.ts
│   │   │   ├── github.ts
│   │   │   ├── microsoft.ts
│   │   │   └── facebook.ts
│   │   └── package.json     # @thisisayande/sso-providers
│   ├── client/              # Client library for apps
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json     # @thisisayande/sso-client
│   ├── create/              # CLI tool (npx @thisisayande/create-sso)
│   │   ├── src/
│   │   │   ├── cli.ts       # Interactive wizard
│   │   │   ├── prompts/     # Question prompts
│   │   │   ├── generators/  # Code generators
│   │   │   ├── templates/   # Framework templates
│   │   │   │   ├── nextjs/
│   │   │   │   ├── react/
│   │   │   │   ├── express/
│   │   │   │   ├── vue/
│   │   │   │   └── nestjs/
│   │   │   └── utils/       # Env manipulation, key gen
│   │   └── package.json     # @thisisayande/create-sso
│   └── config-loader/       # Config loader (shared by CLI & runtime)
│       ├── src/
│       │   └── index.ts
│       └── package.json     # @thisisayande/sso-config
├── apps/                     # Example applications
│   ├── express-demo/
│   ├── nextjs-demo/
│   └── standalone-server/
├── templates/               # Template files for CLI
│   ├── env/
│   │   └── .env.sso.template
│   └── config/
│       └── sso.config.json.template
├── package.json              # Root package.json
├── turbo.json               # Turborepo configuration
├── pnpm-workspace.yaml      # pnpm workspace config
├── pnpm-lock.yaml           # pnpm lockfile
├── tsconfig.base.json
└── .env.example
```

**Published Packages (3 total):**

The project publishes **3 public npm packages** for users:

| Package | Name | Purpose | Includes |
|---------|------|---------|----------|
| Main | `@thisisayande/sso` | Standalone server + Express middleware | Core, Express adapter, Storage adapters, OAuth providers |
| Client | `@thisisayande/sso-client` | Client library for applications | SSOClient class |
| CLI | `@thisisayande/create-sso` | Interactive setup tool | Code generators, templates |

**Internal Packages (bundled into @thisisayande/sso):**

| Package | Name | Purpose |
|---------|------|---------|
| Core | `@thisisayande/sso-core` | Framework-agnostic core (internal) |
| Express | `@thisisayande/sso-express` | Express adapter (internal) |
| Storage | `@thisisayande/sso-storage` | Storage adapters (internal) |
| Providers | `@thisisayande/sso-providers` | OAuth providers (internal) |
| Config | `@thisisayande/sso-config` | Shared config loader (internal) |

**Note:** Internal packages are bundled into `@thisisayande/sso` and not published separately. They use `private: true` in package.json.

### Turborepo Workflow

Turborepo provides intelligent build caching, task orchestration, and parallel execution:

```bash
# Install all dependencies
pnpm install

# Build all packages in dependency order (with caching)
pnpm build

# Run tests (only for changed packages)
pnpm test

# Development mode (watch all packages)
pnpm dev

# Run specific package's dev mode
turbo run dev --filter=@thisisayande/sso
turbo run dev --filter=@thisisayande/sso-client
turbo run dev --filter=@thisisayande/create-sso

# Run internal packages during development
turbo run dev --filter=@thisisayande/sso-core

# Build only changed packages (affected by git changes)
turbo run build --filter="[HEAD^1]"

# Type check all packages
pnpm typecheck

# Clean all build artifacts
pnpm clean
```

**Turborepo Benefits:**
- 🚀 **Faster builds** - Caches build artifacts, only rebuilds changed packages
- 📊 **Smart scheduling** - Parallelizes independent tasks
- 🎯 **Incremental builds** - Only runs tasks affected by changes
- 🔍 **Remote caching** - Option to share cache across team (Turborepo Cloud)
- 📦 **Dependency-aware** - Understands package graph, builds in correct order

**Example - Build with Cache:**
```
$ pnpm build
• Packages in scope: @thisisayande/sso-core, @thisisayande/sso-storage, @thisisayande/sso-client, ...
• Tasks: 12, cached: 10, not cached: 2
• Running build in 2 packages...
• @thisisayande/sso-core:cache miss, executing...
• @thisisayande/sso-storage:cache miss, executing...
• @thisisayande/sso-core:cache hit (0ms)
• @thisisayande/sso-client:cache hit (0ms)
• Tasks: 12 successful, 0 total
```

---

## Implementation Phases

### Phase 1: Project Setup & Core Interfaces (Week 1)

**Tasks:**
1. Set up monorepo with Turborepo + pnpm workspaces
2. Configure TypeScript with base config and project references
3. Define core interfaces
4. Set up Turborepo pipeline for build/dev/test

**Critical Interfaces:**

```typescript
// packages/core/src/interfaces/store.ts
export interface ISessionStore {
  create(session: SSOSession): Promise<string>;
  get(sessionId: string): Promise<SSOSession | null>;
  update(sessionId: string, data: Partial<SSOSession>): Promise<void>;
  delete(sessionId: string): Promise<void>;
  deleteByUserId(userId: string): Promise<number>;
  cleanup(): Promise<number>; // Delete expired sessions
}

export interface IUserStore {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  linkProvider(userId: string, provider: string, providerId: string): Promise<void>;
}

export interface IApplicationStore {
  getById(appId: string): Promise<Application | null>;
  validate(appId: string, secret: string): Promise<boolean>;
  register(app: Application): Promise<Application>;
}
```

```typescript
// packages/core/src/interfaces/auth-provider.ts
export interface IOAuth2Provider {
  name: string;
  getAuthorizationUrl(state: string, redirectUri: string): string;
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuth2Tokens>;
  getUserProfile(accessToken: string): Promise<UserProfile>;
}

export interface IOAuth2Tokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}
```

```typescript
// packages/core/src/interfaces/token-service.ts
export interface ITokenService {
  generate(payload: JWTPayload): Promise<string>;
  verify(token: string): Promise<JWTPayload>;
  rotateKeys(): Promise<void>;
  getJWKS(): JWKSResponse;
}
```

**Files to create:**
- `package.json` (root) - Turborepo scripts
- `turbo.json` - Turborepo configuration
- `pnpm-workspace.yaml` - pnpm workspace config
- `tsconfig.base.json` - Base TypeScript config
- `tsconfig.json` (root) - TypeScript project references
- `packages/core/src/interfaces/*.ts`
- `packages/core/src/types/*.ts`

**Turborepo Configuration:**
```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

**Root package.json:**
```json
{
  "name": "sso-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "turbo run build --filter=...^ && changeset publish"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.8.0",
    "prettier": "^3.0.0",
    "@changesets/cli": "^2.27.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.15.0"
}
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

**Root tsconfig.json:**
```json
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/express-adapter" },
    { "path": "./packages/storage" },
    { "path": "./packages/providers" },
    { "path": "./packages/client" },
    { "path": "./packages/create" },
    { "path": "./packages/config-loader" }
  ]
}
```

**Example package.json (core - INTERNAL):**
```json
{
  "name": "@thisisayande/sso-core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "zod": "^3.0.0",
    "jose": "^5.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.8.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

**Example package.json (main - PUBLISHED):**
```json
{
  "name": "@thisisayande/sso",
  "version": "0.0.0",
  "private": false,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "bin": {
    "sso-server": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc && node scripts/bundle.js",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@thisisayande/sso-core": "workspace:*",
    "@thisisayande/sso-express": "workspace:*",
    "@thisisayande/sso-storage": "workspace:*",
    "@thisisayande/sso-providers": "workspace:*",
    "@thisisayande/sso-config": "workspace:*",
    "express": "^5.0.0",
    "ioredis": "^5.0.0",
    "pg": "^8.0.0",
    "mongodb": "^6.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.8.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

**Example package.json (client - PUBLISHED):**
```json
{
  "name": "@thisisayande/sso-client",
  "version": "0.0.0",
  "private": false,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.8.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

**Example package.json (CLI - PUBLISHED):**
```json
{
  "name": "@thisisayande/create-sso",
  "version": "0.0.0",
  "private": false,
  "type": "module",
  "main": "./dist/index.js",
  "bin": {
    "create-sso": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "inquirer": "^9.0.0",
    "commander": "^11.0.0",
    "chalk": "^5.0.0",
    "ora": "^6.0.0",
    "fs-extra": "^11.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/inquirer": "^9.0.0",
    "typescript": "^5.8.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

**Reference existing:**
- `src/types/sso.ts` - Base types (User, SSOApplication, SSOSession)

---

### Phase 2: Core Services (Week 2)

**Tasks:**
1. Implement TokenService with RS256
2. Implement SessionService
3. Implement AuthService
4. Add crypto utilities

**Key Files:**

```typescript
// packages/core/src/services/token-service.ts
export class RS256TokenService implements ITokenService {
  private keyPair: KeyPair;
  private keyId: string;

  constructor(config: { privateKey: string; publicKey?: string; keyId?: string });
  generate(payload: JWTPayload): Promise<string>; // Signs with RS256, includes kid
  verify(token: string): Promise<JWTPayload>;    // Verifies with RS256
  rotateKeys(): Promise<void>();                    // Generates new key pair
  getJWKS(): JWKSResponse;                        // Returns public keys
}
```

```typescript
// packages/core/src/services/session-service.ts
export class SessionService {
  constructor(private store: ISessionStore, private config: SessionConfig);

  create(userId: string, data: SessionData): Promise<string>;
  validate(sessionId: string): Promise<SSOSession | null>;
  revoke(sessionId: string): Promise<void>;
  revokeAll(userId: string): Promise<void>; // Logout from all devices
  extend(sessionId: string): Promise<void>;
}
```

**Files to create:**
- `packages/core/src/services/token-service.ts`
- `packages/core/src/services/session-service.ts`
- `packages/core/src/services/auth-service.ts`
- `packages/core/src/crypto/rsa.ts`
- `packages/core/src/crypto/jwks.ts`

**Reference existing:**
- `src/services/sso.ts` - Session/token logic patterns
- `src/services/auth.ts` - Auth patterns

---

### Phase 3: Storage Adapters (Week 3)

**Tasks:**
1. Implement Redis store
2. Implement PostgreSQL store
3. Implement MongoDB store
4. Implement in-memory store (dev only)

**Key Pattern:**

```typescript
// packages/storage/src/redis.ts
export class RedisSessionStore implements ISessionStore {
  constructor(private client: RedisClient, config: RedisConfig);

  async create(session: SSOSession): Promise<string> {
    const sessionId = generateId();
    await this.client.setex(
      `session:${sessionId}`,
      session.ttlSeconds,
      JSON.stringify(session)
    );
    return sessionId;
  }

  async get(sessionId: string): Promise<SSOSession | null> {
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  // ... other methods
}
```

**Files to create:**
- `packages/storage/src/redis.ts`
- `packages/storage/src/postgres.ts` (with migration files)
- `packages/storage/src/mongodb.ts`
- `packages/storage/src/memory.ts`
- `packages/storage/src/index.ts` (factory function)

**Dependencies to add:**
- `redis` or `ioredis`
- `pg` for PostgreSQL
- `mongodb` for MongoDB
- `ioredis` is recommended

---

### Phase 4: OAuth Provider System (Week 4)

**Tasks:**
1. Implement base OAuth2 provider
2. Implement Google provider
3. Implement GitHub provider
4. Implement Microsoft provider
5. Implement Facebook provider
6. Create ProviderRegistry

**Key Pattern:**

```typescript
// packages/providers/src/base.ts
export abstract class OAuth2Provider implements IOAuth2Provider {
  abstract name: string;
  abstract authorizationEndpoint: string;
  abstract tokenEndpoint: string;
  abstract userInfoEndpoint: string;

  constructor(
    protected config: OAuth2Config,
    protected fetch: FetchFn = globalThis.fetch
  ) {}

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.config.scope,
      state,
    });
    return `${this.authorizationEndpoint}?${params}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuth2Tokens> {
    // Standard OAuth2 token exchange
  }

  async getUserProfile(accessToken: string): Promise<UserProfile> {
    // Fetch user info from userInfoEndpoint
  }
}
```

```typescript
// packages/providers/src/google.ts
export class GoogleProvider extends OAuth2Provider {
  name = 'google';
  authorizationEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
  tokenEndpoint = 'https://oauth2.googleapis.com/token';
  userInfoEndpoint = 'https://www.googleapis.com/oauth2/v2/userinfo';
}
```

**Files to create:**
- `packages/providers/src/base.ts`
- `packages/providers/src/google.ts`
- `packages/providers/src/github.ts`
- `packages/providers/src/microsoft.ts`
- `packages/providers/src/facebook.ts`
- `packages/providers/src/registry.ts`
- `packages/providers/src/index.ts`

**Reference existing:**
- `src/auth/google.ts` - Current Google implementation pattern

---

### Phase 5: Express Adapter (Week 5)

**Tasks:**
1. Create middleware factory
2. Implement SSO routes
3. Add security middleware
4. Create standalone server

**Key Pattern:**

```typescript
// packages/express-adapter/src/middleware.ts
export function createSSOMiddleware(config: SSOConfig): express.RequestHandler {
  const { coreServices, providers, storage } = config;

  const router = express.Router();

  // Login endpoint
  router.get('/login', handleLogin(coreServices, providers));
  router.post('/authenticate', handleAuthenticate(coreServices));
  router.post('/validate', handleValidate(coreServices));
  router.post('/logout', handleLogout(coreServices));

  return router;
}

// packages/express-adapter/src/server.ts
export async function createSSOServer(config: ServerConfig): Promise<Server> {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors(config.cors));
  app.use(express.json());

  // Rate limiting
  app.use('/sso/authenticate', createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }));

  // SSO routes
  app.use('/sso', createSSOMiddleware(config));

  // Health check
  app.get('/health', handleHealthCheck(storage));

  return app.listen(config.server.port);
}
```

**Files to create:**
- `packages/express-adapter/src/middleware.ts`
- `packages/express-adapter/src/routes.ts`
- `packages/express-adapter/src/handlers/`
- `packages/express-adapter/src/middleware/security.ts`
- `packages/express-adapter/src/middleware/rate-limit.ts`
- `packages/express-adapter/src/server.ts`
- `packages/express-adapter/src/index.ts`

**Dependencies to add:**
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `csurf` or `@fastify/csrf-protection` - CSRF

**Reference existing:**
- `src/routes/sso.ts` - Route patterns
- `src/server.ts` - Server setup

---

### Phase 6: Client Library (Week 6)

**Tasks:**
1. Create SSOClient class
2. Add token validation
3. Add token refresh support

**Key Pattern:**

```typescript
// packages/client/src/index.ts
export class SSOClient {
  constructor(
    private config: {
      appId: string;
      appSecret: string;
      ssoUrl: string;
      fetch?: FetchFn;
    }
  ) {}

  getLoginUrl(options: { redirectUri: string; state?: string; provider?: string }): string {
    const params = new URLSearchParams({
      app_id: this.config.appId,
      redirect_uri: options.redirectUri,
      state: options.state || generateState(),
      ...(options.provider && { provider: options.provider }),
    });
    return `${this.config.ssoUrl}/sso/login?${params}`;
  }

  async validateToken(token: string): Promise<TokenValidationResult> {
    const response = await this.fetch(`${this.config.ssoUrl}/sso/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, app_id: this.config.appId }),
    });
    return response.json();
  }

  async exchangeCodeForTokens(code: string, state: string): Promise<TokenExchangeResult> {
    // Handle OAuth2 code exchange
  }

  async refreshToken(refreshToken: string): Promise<TokenExchangeResult> {
    // Handle token refresh
  }
}
```

**Files to create:**
- `packages/client/src/index.ts`
- `packages/client/src/types.ts`

**Reference existing:**
- `src/lib/sso-client.ts` - Current client implementation

---

### Phase 7: CLI Tool & Templates (Week 7)

**Tasks:**
1. Implement interactive CLI wizard with prompts
2. Create environment variable generator
3. Implement RSA key generation utility
4. Build template system for different frameworks
5. Add code scaffolding generators
6. Create config file support (JSON mode)

**Key Components:**

```typescript
// packages/create/src/cli.ts
#!/usr/bin/env node

import { createSSOConfig } from './prompts/config';
import { generateEnvFile } from './generators/env';
import { generateCodeTemplates } from './generators/templates';
import { generateRSAKeys } from './utils/keys';

export async function runCLI() {
  console.log('Welcome to SSO Setup Wizard 🚀');

  // Interactive prompts
  const config = await createSSOConfig();
  /*
    Result:
    {
      projectType: 'application' | 'provider',
      framework: 'nextjs' | 'react' | 'express' | 'vue' | 'nestjs',
      envFile: '.env',
      storage: { type: 'redis', redis: { host: 'localhost', port: 6379 } },
      providers: { google: { clientId, clientSecret } },
      applications: [{ id, name, redirectUrl }],
      server: { baseUrl, port },
      generateKeys: true,
      generateCode: true,
    }
  */

  // Generate JWT keys if requested
  if (config.generateKeys) {
    await generateRSAKeys('./keys');
  }

  // Append/update .env file
  await generateEnvFile(config.envFile, config);

  // Generate code templates if requested
  if (config.generateCode) {
    await generateCodeTemplates(config);
  }

  console.log('Setup Complete! ✅');
}
```

```typescript
// packages/create/src/generators/env.ts
export async function generateEnvFile(
  envPath: string,
  config: SSOConfig
) {
  const envContent = formatEnvVars(config);

  // Append to existing .env or create new
  if (fs.existsSync(envPath)) {
    await appendToEnvFile(envPath, envContent);
  } else {
    await writeEnvFile(envPath, envContent);
  }
}

function formatEnvVars(config: SSOConfig): string {
  return `
# ═══════════════════════════════════════════════════════════════
# SSO Configuration (Generated by @thisisayande/create-sso)
# ═══════════════════════════════════════════════════════════════

# SSO Server
SSO_BASE_URL=${config.server.baseUrl}
SSO_PORT=${config.server.port}
NODE_ENV=development

# JWT Keys
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ISSUER=sso
JWT_AUDIENCE=sso

# Storage Configuration
STORAGE_TYPE=${config.storage.type}
${formatStorageConfig(config.storage)}

# OAuth Providers
${formatProviderConfig('GOOGLE', config.providers.google)}
${formatProviderConfig('GITHUB', config.providers.github)}
${formatProviderConfig('MICROSOFT', config.providers.microsoft)}
${formatProviderConfig('FACEBOOK', config.providers.facebook)}

# Registered Applications
${formatApplicationConfig(config.applications)}

# Security
CSRF_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
COOKIE_SECURE=${config.security?.cookies?.secure ? 'true' : 'false'}
COOKIE_SAME_SITE=${config.security?.cookies?.sameSite || 'lax'}
`;
}
```

```typescript
// packages/create/src/templates/nextjs.ts
export const nextjsTemplates = {
  ssoClient: `
import { SSOClient } from '@thisisayande/sso-client';

export const ssoClient = new SSOClient({
  appId: process.env.SSO_APP_ID!,
  appSecret: process.env.SSO_APP_SECRET!,
  ssoUrl: process.env.SSO_BASE_URL!,
});

export const getLoginUrl = (provider: string = 'google') => {
  return ssoClient.getLoginUrl({
    redirectUri: \`\${window.location.origin}/auth/callback\`,
    state: crypto.randomUUID(),
    provider,
  });
};
`,

  loginButton: `
'use client';

import { getLoginUrl } from '@/lib/sso';

export function LoginButton() {
  const providers = ['google', 'github'];

  return (
    <div className="login-buttons">
      {providers.map((provider) => (
        <button
          key={provider}
          onClick={() => (window.location.href = getLoginUrl(provider))}
          className="provider-button"
        >
          Continue with {provider.charAt(0).toUpperCase() + provider.slice(1)}
        </button>
      ))}
    </div>
  );
}
`,

  callbackPage: `
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ssoClient } from '@/lib/sso';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      ssoClient.validateToken(token).then((result) => {
        if (result.valid) {
          localStorage.setItem('user', JSON.stringify(result.user));
          router.push('/dashboard');
        }
      });
    }
  }, [router]);

  return <div>Authenticating...</div>;
}
`,
};
```

**Files to create:**
- `packages/create/src/cli.ts`
- `packages/create/src/prompts/` - All interactive prompts
- `packages/create/src/generators/` - env, keys, templates
- `packages/create/src/templates/` - Framework-specific templates
- `packages/create/src/utils/` - Helper utilities
- `packages/create/package.json`

**Templates to include:**
- `nextjs/` - Next.js SSR/SSG
- `react/` - React with Vite
- `express/` - Express.js
- `vue/` - Vue 3
- `nestjs/` - NestJS framework
- `svelte/` - SvelteKit

**Dependencies to add:**
- `enquirer` or `inquirer` - Interactive prompts
- `commander` - CLI argument parsing
- `chalk` - Terminal styling
- `ora` - Loading spinners
- `fs-extra` - Enhanced file operations
- `crypto` - Built-in, for secure key/secret generation

---

### Phase 8: Configuration & Validation (Week 8)

**Tasks:**
1. Create configuration schema with Zod
2. Implement config validation
3. Add environment variable support

**Key Pattern:**

```typescript
// packages/config-loader/src/index.ts
import { z } from 'zod';
import fs from 'fs';

export const SSOConfigSchema = z.object({
  server: z.object({
    port: z.number().default(5000),
    baseUrl: z.string().url(),
    frontendUrl: z.string().url().optional(),
  }),
  jwt: z.object({
    privateKeyPath: z.string().default('./keys/private.pem'),
    publicKeyPath: z.string().default('./keys/public.pem'),
    privateKey: z.string().optional(), // Fallback if file not provided
    publicKey: z.string().optional(),
    issuer: z.string().default('sso'),
    audience: z.array(z.string()).default(['sso']),
    expiresIn: z.string().default('24h'),
  }),
  storage: z.object({
    type: z.enum(['redis', 'postgres', 'mongodb', 'memory']),
    redis: z.object({
      host: z.string().default('localhost'),
      port: z.number().default(6379),
      password: z.string().optional(),
      db: z.number().default(0),
    }).optional(),
    postgres: z.object({
      connectionString: z.string(),
    }).optional(),
    mongodb: z.object({
      connectionString: z.string(),
    }).optional(),
  }),
  providers: z.record(z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    scope: z.string().optional(),
  })),
  applications: z.array(z.object({
    id: z.string(),
    name: z.string(),
    secret: z.string(),
    redirectUrl: z.string().url(),
  })).default([]),
  security: z.object({
    rateLimit: z.object({
      windowMs: z.number().default(15 * 60 * 1000),
      max: z.number().default(100),
    }),
    csrf: z.object({
      enabled: z.boolean().default(true),
    }),
    cors: z.object({
      enabled: z.boolean().default(true),
      origins: z.array(z.string()).default(['*']),
      credentials: z.boolean().default(true),
    }),
    cookies: z.object({
      domain: z.string().optional(),
      secure: z.boolean().default(false),
      sameSite: z.enum(['strict', 'lax', 'none']).default('lax'),
    }),
  }),
});

export function loadSSOConfig(): SSOConfig {
  const rawConfig: any = {
    server: {
      port: parseInt(process.env.SSO_PORT || '5000'),
      baseUrl: process.env.SSO_BASE_URL!,
      frontendUrl: process.env.SSO_FRONTEND_URL,
    },
    jwt: {
      privateKeyPath: process.env.JWT_PRIVATE_KEY_PATH,
      publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH,
      issuer: process.env.JWT_ISSUER || 'sso',
      audience: (process.env.JWT_AUDIENCE || 'sso').split(','),
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
    storage: {
      type: (process.env.STORAGE_TYPE || 'memory') as StorageType,
      redis: process.env.STORAGE_TYPE === 'redis' ? {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
      } : undefined,
      postgres: process.env.STORAGE_TYPE === 'postgres' ? {
        connectionString: process.env.DATABASE_URL,
      } : undefined,
      mongodb: process.env.STORAGE_TYPE === 'mongodb' ? {
        connectionString: process.env.MONGODB_URI,
      } : undefined,
    },
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      },
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      },
      facebook: {
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      },
    },
    applications: parseApplicationsFromEnv(),
    security: {
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
        max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      },
      csrf: {
        enabled: process.env.CSRF_ENABLED !== 'false',
      },
      cors: {
        enabled: process.env.CORS_ENABLED !== 'false',
        origins: process.env.CORS_ORIGINS?.split(',') || ['*'],
        credentials: process.env.CORS_CREDENTIALS !== 'false',
      },
      cookies: {
        domain: process.env.COOKIE_DOMAIN,
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: (process.env.COOKIE_SAME_SITE as any) || 'lax',
      },
    },
  };

  // Load keys from files if paths provided
  if (rawConfig.jwt.privateKeyPath && fs.existsSync(rawConfig.jwt.privateKeyPath)) {
    rawConfig.jwt.privateKey = fs.readFileSync(rawConfig.jwt.privateKeyPath, 'utf8');
  }
  if (rawConfig.jwt.publicKeyPath && fs.existsSync(rawConfig.jwt.publicKeyPath)) {
    rawConfig.jwt.publicKey = fs.readFileSync(rawConfig.jwt.publicKeyPath, 'utf8');
  }

  // Validate and return
  return SSOConfigSchema.parse(rawConfig);
}

function parseApplicationsFromEnv(): Array<{
  id: string;
  name: string;
  secret: string;
  redirectUrl: string;
}> {
  const apps: any[] = [];
  let i = 1;
  while (process.env[`APP${i}_ID`]) {
    apps.push({
      id: process.env[`APP${i}_ID`],
      name: process.env[`APP${i}_NAME`],
      secret: process.env[`APP${i}_SECRET`],
      redirectUrl: process.env[`APP${i}_REDIRECT_URL`],
    });
    i++;
  }
  return apps;
}
```

**Files to create:**
- `packages/config-loader/src/index.ts`
- `packages/config-loader/src/schema.ts`
- `packages/config-loader/src/types.ts`
- `packages/config-loader/package.json`

**Dependencies to add:**
- `zod` - Runtime type validation
- `dotenv` - Environment variable loading

---

### Phase 9: Security & Hardening (Week 9)

**Tasks:**
1. Implement security middleware
2. Add input validation on all endpoints
3. Implement CSRF protection
4. Add rate limiting
5. Implement session invalidation on password change

**Security Checklist:**
- [ ] Helmet middleware for security headers
- [ ] Rate limiting on auth endpoints
- [ ] CSRF tokens for state-changing operations
- [ ] Input validation on all request bodies
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (Content-Security-Policy)
- [ ] Secure cookie flags (httpOnly, secure, sameSite)
- [ ] CORS configuration
- [ ] Request logging (but sensitive data redaction)

**Files to modify/create:**
- `packages/express-adapter/src/middleware/security.ts`
- `packages/express-adapter/src/middleware/validation.ts`
- `packages/express-adapter/src/middleware/csrf.ts`
- `packages/express-adapter/src/middleware/rate-limit.ts`

---

### Phase 10: Testing Suite (Week 10-11)

**Unit Tests:**
- Core services (token, session, auth)
- Storage adapters
- OAuth providers
- Client library

**Integration Tests:**
- Full auth flows with test stores
- Provider integration tests (mock OAuth callbacks)

**E2E Tests:**
- Playwright tests for full OAuth flows
- Session persistence across apps
- Logout scenarios

**Files to create:**
- `packages/core/**/*.test.ts`
- `packages/storage/**/*.test.ts`
- `packages/providers/**/*.test.ts`
- `packages/express-adapter/**/*.test.ts`
- `apps/e2e-tests/`
- `jest.config.js`

**Dependencies to add:**
- `jest` - Testing framework
- `ts-jest` - TypeScript support
- `@types/jest`
- `supertest` - HTTP testing
- `playwright` or `@playwright/test` - E2E testing

---

### Phase 11: Documentation (Week 12)

**Tasks:**
1. Write README for root package
2. Document API for each package
3. Create usage examples
4. Add JSDoc comments
5. Generate TypeScript docs

**Documentation Structure:**
```
/docs
  ├── getting-started.md
  ├── configuration.md
  ├── storage-options.md
  ├── auth-providers.md
  ├── api-reference.md
  └── migration-guide.md
```

**Examples to create:**
- `apps/express-demo/` - Express app using middleware
- `apps/standalone-server/` - Using standalone server
- `apps/client-demo/` - Using client library

---

### Phase 12: CI/CD & Publishing (Week 13)

**Tasks:**
1. Set up GitHub Actions for CI
2. Add automated testing
3. Add automated publishing to npm
4. Set up semantic release

**CI/CD Pipeline:**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
      - run: pnpm lint
      - run: pnpm build
```

**Files to create:**
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `.github/dependabot.yml`
- `publish.config.js` (semantic-release)

**Dependencies to add:**
- `semantic-release`
- `@semantic-release/git`
- `@semantic-release/npm`

---

### Phase 13: Polish & Optimization (Week 14)

**Tasks:**
1. Performance optimization
2. Error handling improvements
3. Logging integration
4. Health check endpoints
5. Graceful shutdown

**Final Checklist:**
- [ ] All tests passing with 80%+ coverage
- [ ] No TypeScript errors
- [ ] Security audit passing (`npm audit`)
- [ ] Documentation complete
- [ ] Example apps working
- [ ] CLI tool tested across different project types
- [ ] Templates generated correctly for all frameworks
- [ ] CI/CD pipeline working
- [ ] Ready for npm publish

---

## Critical Files from Current Codebase

**To be refactored/reused:**
- `src/types/sso.ts` - Base types (User, SSOApplication, SSOSession) → move to core
- `src/services/sso.ts` - Session/token patterns → reference for new services
- `src/services/auth.ts` - Auth patterns → reference for AuthService
- `src/lib/sso-client.ts` - Client patterns → reference for new client library
- `src/auth/google.ts` - Google OAuth → reference for provider system

**To be replaced:**
- `src/store/index.ts` - Replace with storage adapters
- `src/routes/sso.ts` - Replace with Express adapter routes
- `src/server.ts` - Replace with standalone server implementation

**New packages to create:**
- `packages/create/` - CLI tool with interactive wizard
- `packages/config-loader/` - Shared config loading for CLI & runtime
- `packages/templates/` - Framework-specific code templates

---

## Security Configuration

**Required Environment Variables (.env.example) - Generated by CLI:**
```env
# ═══════════════════════════════════════════════════════════════
# SSO Server Configuration
# ═══════════════════════════════════════════════════════════════
SSO_BASE_URL=https://sso.example.com
SSO_PORT=5000
SSO_FRONTEND_URL=https://app.example.com
NODE_ENV=production

# ═══════════════════════════════════════════════════════════════
# JWT Configuration
# ═══════════════════════════════════════════════════════════════
# Use file paths (recommended) or inline keys
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
# Alternative: JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
# Alternative: JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
JWT_ISSUER=sso
JWT_AUDIENCE=sso
JWT_EXPIRES_IN=24h

# ═══════════════════════════════════════════════════════════════
# Storage Configuration
# ═══════════════════════════════════════════════════════════════
STORAGE_TYPE=redis

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# PostgreSQL Configuration
# DATABASE_URL=postgresql://user:password@localhost:5432/sso

# MongoDB Configuration
# MONGODB_URI=mongodb://localhost:27017/sso

# ═══════════════════════════════════════════════════════════════
# OAuth Providers (Add credentials for each provider you use)
# ═══════════════════════════════════════════════════════════════
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# ═══════════════════════════════════════════════════════════════
# Registered Applications (Generated by CLI, add more as needed)
# ═══════════════════════════════════════════════════════════════
APP1_ID=
APP1_NAME=
APP1_SECRET=
APP1_REDIRECT_URL=

APP2_ID=
APP2_NAME=
APP2_SECRET=
APP2_REDIRECT_URL=

# ═══════════════════════════════════════════════════════════════
# Security Configuration
# ═══════════════════════════════════════════════════════════════
# CSRF Protection
CSRF_ENABLED=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100

# CORS
CORS_ENABLED=true
CORS_ORIGINS=https://app1.example.com,https://app2.example.com
CORS_CREDENTIALS=true

# Cookies
COOKIE_DOMAIN=.example.com  # For cross-subdomain SSO
COOKIE_SECURE=true         # Must be true for HTTPS
COOKIE_SAME_SITE=lax
```

**For Client Apps (separate .env):**
```env
# SSO Client Configuration
SSO_APP_ID=app1
SSO_APP_SECRET=your-app-secret
SSO_BASE_URL=https://sso.example.com

# For Next.js: NEXT_PUBLIC_SSO_APP_ID=app1
# For React: REACT_APP_SSO_APP_ID=app1
```

---

## Verification Steps

After implementation, verify:

1. **Unit Tests:** `pnpm test` or `turbo run test` - all pass, 80%+ coverage
2. **Integration Tests:** `turbo run test:integration` - all pass
3. **E2E Tests:** `turbo run test:e2e` - all flows work
4. **Type Check:** `turbo run typecheck` - no errors
5. **Lint:** `turbo run lint` - no issues
6. **Security Audit:** `pnpm audit` - no vulnerabilities
7. **Build:** `turbo run build` - all packages compile (with proper dependency order)
8. **CLI Testing:** `npx @thisisayande/create-sso` - interactive wizard works:
   - Generates valid .env file
   - Creates JWT keys
   - Generates correct templates for each framework
9. **Local Demo:** Run example apps and verify:
   - OAuth flow with Google
   - Session creation and validation
   - Token verification
   - Logout clears all sessions
10. **Health Check:** `GET /health` returns 200 with status
11. **JWKS Endpoint:** `GET /.well-known/jwks.json` returns public keys
12. **Turborepo Cache:** Verify cache is working for repeat builds

---

## Dependencies Summary

**New dependencies to add:**

### Monorepo & Build
- `turbo` - Build system & task orchestration
- `pnpm` - Package manager (>= 8.0.0)
- `typescript` - TypeScript compiler (>= 5.8.0)
- `@changesets/cli` - Versioning & publishing
- `prettier` - Code formatting
- `tsup` - Fast TypeScript bundler for packages

### Core Packages
- `zod` - Validation
- `jose` or `jsonwebtoken` - JWT handling
- `winston` or `pino` - Logging
- `dotenv` - Environment variable loading

### Storage
- `ioredis` - Redis client (recommended)
- `pg` - PostgreSQL client
- `mongodb` - MongoDB client

### Express Adapter
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `csurf` or `@fastify/csrf-protection` - CSRF

### CLI Package
- `inquirer` or `enquirer` - Interactive prompts
- `commander` - CLI argument parsing
- `chalk` - Terminal styling
- `ora` - Loading spinners
- `fs-extra` - Enhanced file operations
- `node-cron` - For key rotation jobs

### Testing
- `jest` - Testing framework
- `ts-jest` - TypeScript support
- `@types/jest`
- `supertest` - HTTP testing
- `playwright` or `@playwright/test` - E2E testing
- `@inquirer/testing` - For testing CLI prompts

### Release & CI/CD
- `semantic-release` - Release automation
- `@semantic-release/git`
- `@semantic-release/npm`

**Existing dependencies to keep:**
- `express`, `express-session`, `cors`, `cookie-parser`
- `passport`, `passport-google-oauth20`
