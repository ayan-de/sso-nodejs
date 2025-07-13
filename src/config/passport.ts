import passport from 'passport';
import { users } from '../store';

// Serialize user for session
// This saves user ID into session
// This makes req.user available on future requests.
// Session is stored on the server (in memory or store)
// Session ID is stored in a cookie (like connect.sid)
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id: string, done) => {
    const user = users.get(id);
    done(null, user || null);
});

export default passport;
