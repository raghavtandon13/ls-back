const GoogleStrategy = require("passport-google-oauth2").Strategy;
const User = require("../models/user.model");
const GOOGLE_AUTH_CLIENT_ID = process.env.GOOGLE_AUTH_CLIENT_ID;
const GOOGLE_AUTH_CLIENT_SECRET = process.env.GOOGLE_AUTH_CLIENT_SECRET;

module.exports = (passport) => {
    passport.use(
        new GoogleStrategy(
            {
                clientID: GOOGLE_AUTH_CLIENT_ID,
                clientSecret: GOOGLE_AUTH_CLIENT_SECRET,
                callbackURL: "http://localhost:4000/auth/google/callback",
                passReqToCallback: true,
            },
            async (_request, _accessToken, _refreshToken, profile, done) => {
                try {
                    let existingUser = await User.findOne({ "google.id": profile.id });
                    if (existingUser) return done(null, existingUser);
                    const newUser = new User({
                        method: "google",
                        google: {
                            id: profile.id,
                            name: profile.displayName,
                            email: profile.emails[0].value,
                        },
                    });
                    await newUser.save();
                    return done(null, newUser);
                } catch (error) {
                    return done(error, false);
                }
            },
        ),
    );
};
