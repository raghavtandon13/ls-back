const router = require("express").Router();
const jwt = require("jsonwebtoken");
const passport = require("passport");
const JWT_SECRET = process.env.JWT_SECRET;
require("../controllers/passportConfig")(passport);

router.get("/", passport.authenticate("google", { scope: ["email", "profile"] }));

router.get("/callback", passport.authenticate("google", { session: false }), (req, res) => {
    jwt.sign({ user: req.user }, JWT_SECRET, { expiresIn: "24h" }, (err, token) => {
        if (err) return res.json({ type: "error", data: { token: null } });
        res.json({ type: "success", data: { token, user: req.user } });
    });
});

module.exports = router;
