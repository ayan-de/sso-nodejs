"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const store_1 = require("../store");
// Serialize user for session
// This saves user ID into session
// This makes req.user available on future requests.
// Session is stored on the server (in memory or store)
// Session ID is stored in a cookie (like connect.sid)
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
// Deserialize user from session
passport_1.default.deserializeUser((id, done) => {
    const user = store_1.users.get(id);
    done(null, user || null);
});
exports.default = passport_1.default;
