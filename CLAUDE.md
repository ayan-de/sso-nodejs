# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run build` - Compile TypeScript to JavaScript in `dist/`
- `npm run dev` - Start the SSO Provider server (port 5000) with hot reload via nodemon
- `npm run dev:all` - Start SSO Provider, Client App 1 (port 3001), and Client App 2 (port 3002) concurrently
- `npm start` - Run the compiled server from `dist/server.js`

## Architecture

This is a centralized Single Sign-On (SSO) system with three main components:

### SSO Provider (`src/server.ts` - port 5000)
The central authentication authority that:
- Manages user credentials and sessions via `src/store/index.ts` (in-memory Maps, replace with DB in production)
- Issues JWTs signed with each client app's secret
- Handles Google OAuth via `src/auth/google.ts`
- Exposes `/sso/login`, `/sso/authenticate`, `/sso/validate` endpoints

### Client Applications (`src/client1.ts`, `src/client2.ts`)
Express apps that redirect users to the SSO provider for login. Each client:
- Uses `SSOClient` class from `src/lib/sso-client.ts` to initiate login and validate tokens
- Maintains its own local session separate from the SSO session
- Runs on ports 3001 and 3002 respectively

## Authentication Flow

1. User visits client app `/login` → redirect to SSO provider with `app_id`, `redirect_uri`, `state`
2. SSO provider checks for existing `sso_session` cookie
   - If present and valid: issue JWT immediately and redirect back
   - If not: show login form (local or Google OAuth)
3. After successful auth, SSO provider:
   - Creates session in `ssoSessions` Map
   - Sets `sso_session` cookie (scoped to provider domain)
   - Generates JWT signed with requesting app's secret
   - Redirects to client's `redirect_uri` with token
4. Client app validates token via `/sso/validate`, creates local session, redirects to dashboard

## Key Patterns

### Two-Layer Session System
- **SSO session**: Stored in `ssoSessions` Map, accessed via `sso_session` cookie. Shared across all client apps.
- **Local session**: Each client maintains its own `express-session` for logged-in users.

### JWT Token Generation
Tokens are signed with the specific client app's secret (`app1-secret`, `app2-secret`). The `/sso/validate` endpoint verifies tokens using the appropriate app secret from `registeredApps`.

### Google OAuth State Management
The OAuth flow encodes `app_id`, `redirect_uri`, and original `state` into a base64-encoded state parameter to preserve them through Google's redirect.

### Session Restoration Middleware
`src/server.ts` has middleware (lines 46-58) that restores `req.user` from the `sso_session` cookie on each request.

## In-Memory Stores (Replace in Production)

All data is stored in Maps in `src/store/index.ts`:
- `users` - User credentials and profiles
- `ssoSessions` - Active SSO sessions with expiration
- `registeredApps` - Allowed client applications with their secrets

For production, replace these with a proper database (PostgreSQL) and use Redis for `ssoSessions`.

## CORS Configuration

Each service has CORS configured for its frontend:
- SSO Provider: `http://localhost:5173`
- Client App 1: `http://localhost:5174`
- Client App 2: `http://localhost:5175`
