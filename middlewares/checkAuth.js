const User = require("../models/user.model");
const { verifyJwtToken } = require("../utils/token.util");

module.exports = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
	console.log(req.headers.authorization)
        if (!header) return next({ status: 403, message: "auth header is misisng" });

        const token = header.split("Bearer ")[1];
        if (!token) return next({ status: 403, message: "auth token is missing" });

        const userId = verifyJwtToken(token, next);
        if (!userId) return next({ status: 403, message: "incorrect token" });

        const user = await User.findById(userId);
        if (!user) return next({ status: 404, message: "user not found" });

        res.locals.user = user;
        next();
    } catch (err) {
        next(err);
    }
};
