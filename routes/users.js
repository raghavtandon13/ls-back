const express = require("express");
const router = express.Router();
const User = require("../models/user.model");
const mongoose = require("mongoose");

router.post("/consent", async (req, res) => {
    try {
        const { phone, timestamp, ip } = req.body;
        const user = await User.findOne({ phone: phone });
        if (!user) {
            const hello = new User({
                phone: phone,
                consent: timestamp,
                consentIp: ip,
                consentHistory: [{ date: new Date(timestamp), ip: ip, curr_date: new Date() }],
            });
            await hello.save();
            res.status(200).json(hello);
        }
        user.consent = timestamp;
        user.consentIp = ip;
        if (!user.consentHistory) {
            user.consentHistory = [];
        }
        user.consentHistory.push({ date: new Date(timestamp), ip: ip, curr_date: new Date() });
        user.gender = user.gender.toUpperCase();
        console.log(user.gender);
        await user.save();
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
router.get("/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: "Invalid user ID" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/lender_ard", async (req, res) => {
    try {
        const { phone } = req.body;
        const user = await User.findOne({ phone: phone });
        if (!user) return res.status(404).json({ error: "User not found" });
        if (!user.accounts || user.accounts.length === 0) return res.status(404).json({ error: "No accounts found" });
        lenderStatuses = user.accounts.map((account) => {
            let status = "Rest";
            if (account.name === "Fibe") {
                if (["customer lead created", "customer lead updated"].includes(account.res.reason)) {
                    status = "Accepted";
                } else if (["customer already exists", "Duplicate request"].includes(account.res.reason)) {
                    status = "Deduped";
                } else if (/(salary|pincode|Pan|Age|Invalid)/i.test(account.res.reason)) {
                    status = "Rejected";
                } else if (account.res.errorMessage) {
                    status = "Errors";
                }
            } else if (account.name === "RamFin") {
                if (
                    ["Lead created successfully.", "Lead created successfully."].includes(account.msg) ||
                    account.lead_status
                ) {
                    status = "Accepted";
                } else if (account.status === "Ineligible") {
                    status = "Rejected";
                } else if (account.status === "Dedupe") {
                    status = "Deduped";
                }
            } else if (account.name === "FatakPay") {
                if (account.status === "Eligible") {
                    status = "Accepted";
                } else if (account.status === "Ineligible") {
                    status = "Rejected";
                } else if (account.status === "Deduped") {
                    status = "Deduped";
                } else if (account.stage_name) {
                    status = "Accepted";
                }
            } else if (account.name === "SmartCoin") {
                if (account.isDuplicateLead === "true") {
                    status = "Deduped";
                } else if (account.isDuplicateLead === "false" || account.message === "Lead created successfully") {
                    status = "Accepted";
                } else if (/(mandatory)/i.test(account.message)) {
                    status = "Errors";
                }
            } else if (account.name === "Zype") {
                if (account.status === "ACCEPT") {
                    status = "Accepted";
                } else if (["REJECT", "REJECT"].includes(account.message)) {
                    status = "Rejected";
                }
            } else if (account.name === "Cashe") {
                if (["pre_approved", "pre_qualified_low"].includes(account.status)) {
                    status = "Accepted";
                } else if (
                    account.status === "rejected" ||
                    /(ERROR)/i.test(account.res.status) ||
                    account.res.payload.status === "rejected"
                ) {
                    status = "Rejected";
                }
            } else if (account.name === "Mpocket") {
                if (["User Eligible for Loan", "New User", "Data Accepted Successfully"].includes(account.message)) {
                    status = "Accepted";
                } else if (
                    ["User Profile Rejected on System", "User Not Eligible for Loan"].includes(account.message) ||
                    !account.message
                ) {
                    status = "Rejected";
                }
            } else if (account.name === "MoneyView") {
                if (
                    !account.message ||
                    ["Lead has been rejected.", "Lead has been expired."].includes(account.message) ||
                    /(nvalid)/i.test(account.message)
                ) {
                    status = "Rejected";
                } else if (account.message === "success") {
                    status = "Accepted";
                }
            } else if (account.name === "LoanTap") {
                if (account.message === "Application created successfully") {
                    status = "Accepted";
                }
            }
            return { lender: account.name, status };
        });
        res.status(200).json(lenderStatuses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/phone/:phone", async (req, res) => {
    try {
        const phone = req.params.phone;
        console.log(phone);

        const user = await User.findOne({ phone: phone });
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
const user = {
    personalDetails: {
        name: "Neeraj",
        email: "example@mail.com",
        phone: "1234567890",
        pan: "ASDFG1234A",
        dob: "12-10-2000",
    },
    professionalDetails: {
        employementType: "Sallaried/Bussiness/Self Employed",
        income: "120000",
    },
    address: {
        city: "XYZ",
        state: "Haryana",
        pinCode: "123456",
    },
};
