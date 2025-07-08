import express from 'express';
import session from 'express-session';
import { SSOClient } from './server';

const app = express();

app.use(session({
    secret: 'client2-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

const ssoClient = new SSOClient('app2', 'app2-secret', 'http://localhost:5000');

app.get('/login', (req, res) => {
    const loginUrl = ssoClient.initiateLogin('http://localhost:3002/auth/callback');
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
            <h1>Client App 2 Dashboard</h1>
            <p>Welcome, ${req.session.user.name}</p>
            <p>Your email is: ${req.session.user.email}</p>
        `);
    } else {
        res.redirect('/login');
    }
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Client App 2 running on http://localhost:${PORT}`);
});
