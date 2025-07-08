# Node.js Single Sign-On (SSO) System

This project demonstrates a simple Single Sign-On (SSO) system built with Node.js. It consists of a central **SSO Provider** and two **Client Applications** that rely on the provider for user authentication.

## Core Components

- **SSO Provider (`server.ts`)**
  - Port: `5000`
  - Central authority for authentication
  - Manages user credentials and issues JWTs
  - Supports local and Google OAuth login

- **Client App 1 (`client1.ts`)**
  - Port: `3001`
  - Uses the SSO provider for login and session handling

- **Client App 2 (`client2.ts`)**
  - Port: `3002`
  - Another app relying on the same SSO provider

---

##  SSO Authentication Flow

###  Login to Client App 1

1. **User opens** `http://localhost:3001/login`.
2. **Client App 1 detects no local session** and redirects to the SSO Provider.
   - Adds `app_id`, `redirect_uri`, and `state` in the query.
3. **SSO Provider presents login options** (form-based or Google OAuth).
4. **Upon successful login**, SSO Provider:
   - Creates a **central session**
   - Stores it in memory (`ssoSessions`)
   - Sets a cookie `sso_session` scoped to `localhost:5000`
5. **SSO Provider issues a JWT** (signed using `app1-secret`) and redirects to:
6. **Client App 1 validates token** via `/sso/validate`, creates its local session, and redirects to `/dashboard`.

---

### Seamless Login to Client App 2

1. User opens `http://localhost:3002/login`.
2. **Client App 2** redirects to the SSO Provider with similar params.
3. **SSO Provider detects the existing `sso_session` cookie**.
4. Skips login, immediately issues a JWT (signed using `app2-secret`), and redirects to:http://localhost:3002/auth/callback?token=
5. **Client App 2 validates token**, creates a local session, and logs user in without showing any login page.

---

## Key Features

- Centralized login using SSO Provider
- Stateless JWT-based token sharing between apps
- Session cookies scoped to provider domain (`localhost:5000`)
- Seamless login across trusted applications
- Supports both local and Google OAuth login flows

---

## 🚀 Running the Project

1. Start the SSO Provider:
```bash
node server.ts
```
2. Start the client files
```bash
ts-node src/client<Number>.ts
```