"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const server_1 = require("./server");
const app = (0, express_1.default)();
app.use((0, express_session_1.default)({
    secret: 'client1-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
const ssoClient = new server_1.SSOClient('app1', 'app1-secret', 'http://localhost:5000');
app.get('/login', (req, res) => {
    const loginUrl = ssoClient.initiateLogin('http://localhost:3001/auth/callback');
    res.redirect(loginUrl);
});
app.get('/auth/callback', async (req, res) => {
    const { token } = req.query;
    const validation = await ssoClient.validateToken(token);
    if (validation.valid) {
        // @ts-ignore
        req.session.user = validation.user;
        res.redirect('/dashboard');
    }
    else {
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
    }
    else {
        res.redirect('/login');
    }
});
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Client App 1 running on http://localhost:${PORT}`);
});
