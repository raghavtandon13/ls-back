
module.exports = (_req, res, next) => {
    const currentUser = res.locals.user;
    if (!currentUser || currentUser.role !== "ADMIN")
        return next({ status: 401, message: "access denied" });
    next();
};
