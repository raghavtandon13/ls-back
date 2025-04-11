const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

exports.createJwtToken = (payload) => {
    const token = jwt.sign(payload, JWT_SECRET);
    //, { expiresIn: "12h" }
    return token;
};

exports.verifyJwtToken = (token, next) => {
    try {
        const { user } = jwt.verify(token, JWT_SECRET);
        return user;
    } catch (err) {
        next(err);
    }
};
