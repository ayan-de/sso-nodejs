import passport from 'passport';
import { users } from '../store';

// Serialize user for session
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id: string, done) => {
    const user = users.get(id);
    done(null, user || null);
});

export default passport;
