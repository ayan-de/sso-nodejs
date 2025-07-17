"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSOClient = exports.app = void 0;
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("./config/passport"));
const sso_client_1 = require("./lib/sso-client");
Object.defineProperty(exports, "SSOClient", { enumerable: true, get: function () { return sso_client_1.SSOClient; } });
const index_1 = __importDefault(require("./routes/index"));
const sso_1 = __importDefault(require("./routes/sso"));
const store_1 = require("./store");
const app = (0, express_1.default)();
exports.app = app;
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173',
    credentials: true,
}));
dotenv_1.default.config();
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Session configuration
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'secretkeyformyssonodejsapp',
    resave: false,
    saveUninitialized: false,
    store: process.env.NODE_ENV === 'production' ? undefined : new express_session_1.default.MemoryStore(),
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
}));
// Initialize Passport
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Middleware to restore req.user from sso_session cookie
app.use((req, res, next) => {
    if (!req.user && req.cookies && req.cookies.sso_session) {
        const session = store_1.ssoSessions.get(req.cookies.sso_session);
        if (session) {
            req.user = {
                id: session.userId,
                email: session.email,
                name: session.name,
            };
        }
    }
    next();
});
// Routes
app.use('/sso', sso_1.default);
app.use('/', index_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
