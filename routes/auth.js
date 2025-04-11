const router = require("express").Router();
const checkAuth = require("../middlewares/checkAuth");
const checkAdmin = require("../middlewares/checkAdmin");
const filterLenders = require("../utils/lenderlist.util");
const { fetchCurrentUser, resendOtp, get_auth } = require("../controllers/auth.controller");
const { verifyPhoneOtp, handleAdmin, check_eli } = require("../controllers/auth.controller");
const User = require("../models/user.model");

router.get("/", (_req, res) => res.status(200).json({ type: "success", message: "Auth service is running" }));
router.post("/", get_auth);
router.post("/eli", check_eli);
// router.post("/profile", () => {

// })
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyPhoneOtp);
router.get("/verify-user", checkAuth, fetchCurrentUser);
router.get("/admin", checkAuth, checkAdmin, handleAdmin);
router.post("/lender", async (req, res) => {
    const { dob, income, pincode } = req.body;
    const result = await filterLenders(dob, income, pincode);
    res.status(200).json({ type: "success", data: result });
});
router.post("/get-lenders", async (req, res) => {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (user.eformFilled === false) {
        return res.status(200).json({ type: "failure", data: "EForm not complete." });
    }
    if (!user.dob || !user.income || !user.pincode) {
        return res.status(200).json({ type: "failure", data: "Insufficient Data" });
    }
    try {
        const result = await filterLenders(user.dob, parseInt(user.income), parseInt(user.pincode));
        res.status(200).json({ type: "success", data: result });
    } catch (error) {
        res.status(200).json({ type: "failure", data: error });
    }
});
router.get("/delete", checkAuth, async (req, res) => {
    console.log("Delete user");
    const userId = res.locals.user._id.toString();
    console.log(userId);
    try {
        const user = await User.findById(userId);
        user.accountDeleted = true;
        await user.save();
        res.status(200).json({ type: "success", message: "User deleted" });
    } catch (error) {
        res.status(200).json({ type: "failure", message: error });
    }
});

router.post("/stage", async (req, res) => {
    try {
        const { userId, stage } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ type: "error", message: "User not found" });
        user.stage.forEach((s) => (s.current = false));
        user.stage.push({ name: stage, date: Date.now(), current: true });
        await user.save();
        res.status(200).json({ type: "success", message: "Stage updated", currentStage: stage });
    } catch (err) {
        console.error(err);
        res.status(500).json({ type: "error", message: "An error occurred while updating stage" });
    }
});

module.exports = router;
