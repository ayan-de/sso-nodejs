import cors from 'cors';
import express from 'express';
import session from 'express-session';
import { SSOClient } from './server';

const app = express();

app.use(
  cors({
    origin: 'http://localhost:5174',
    credentials: true,
  })
);

app.use(
  session({
    secret: 'client1-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

const ssoClient = new SSOClient('app1', 'app1-secret', 'http://localhost:5000');

app.get('/login', (req, res) => {
  const loginUrl = ssoClient.initiateLogin('http://localhost:3001/auth/callback');
  res.redirect(loginUrl);
});

app.get('/auth/callback', async (req, res) => {
  const { token } = req.query;
  const validation = await ssoClient.validateToken(token as string);

  if (validation.valid) {
    // @ts-ignore
    req.session.user = validation.user;
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

app.get('/dashboard', (req, res) => {
  // @ts-ignore
  if (req.session.user) {
    // @ts-ignore
    res.send(`
            <h1>Client App 1 Dashboard</h1>
            <p>Welcome, ${req.session.user.name}</p>
            <p>Your email is: ${req.session.user.email}</p>
        `);
  } else {
    res.redirect('/login');
  }
});

app.get('/logout', async (req, res) => {
  // Destroy local session
  req.session.destroy(() => {
    // Call SSO server logout to clear global session
    // Use fetch or any HTTP client
    fetch('http://localhost:5000/logout', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }).finally(() => {
      res.clearCookie('sso_session');
      res.redirect('/login');
    });
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Client App 1 running on http://localhost:${PORT}`);
});
