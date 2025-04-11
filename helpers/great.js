const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;

const startDate = new Date("2025-01-30");
const endDate = new Date("2025-01-31");

const dateRangeCondition = {
    $and: [{ $gte: ["$$account.resp_date", startDate] }, { $lte: ["$$account.resp_date", endDate] }],
};

const _fibedateRangeCondition = {
    $and: [
        { $gte: [{ $dateFromString: { dateString: "$$account.res.responseDate" } }, startDate] },
        { $lte: [{ $dateFromString: { dateString: "$$account.res.responseDate" } }, endDate] },
    ],
};

mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

async function getCounts() {
    console.log("Getting counts...");
    const startTime = process.hrtime();
    const counts = await User.aggregate([
        {
            $addFields: {
                lenderStatuses: {
                    $map: {
                        input: "$accounts",
                        as: "account",
                        in: {
                            lender: "$$account.name",
                            status: {
                                $switch: {
                                    branches: [
                                        // FIBE CONDITIONS
                                        { case: { $and: [ { $eq: [ "$$account.name", "Fibe" ] }, { $eq: [ "$$account.res.reason", "customer lead created" ] }, dateRangeCondition ] }, then: "Accepted" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Fibe" ] }, { $eq: [ "$$account.res.reason", "customer lead updated" ] }, dateRangeCondition ] }, then: "Accepted" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Fibe" ] }, { $regexMatch: { input: "$$account.res.reason", regex: /(salary|pincode|Pan|Age|Invalid)/i } }, dateRangeCondition ] }, then: "Rejected" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Fibe" ] }, { $eq: [ "$$account.res.reason", "customer already exists" ] }, dateRangeCondition ] }, then: "Deduped" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Fibe" ] }, { $eq: [ "$$account.res.reason", "Duplicate request" ] }, dateRangeCondition ] }, then: "Deduped" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Fibe" ] }, { $ne: [ "$$account.res.errorMessage", null ] }, dateRangeCondition ] }, then: "Errors" },
                                        // RAMFIN CONDITIONS
                                        { case: { $and: [ { $eq: [ "$$account.name", "RamFin" ] }, { $eq: [ "$$account.msg", "Lead created successfully." ] }, dateRangeCondition ] }, then: "Accepted" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "RamFin" ] }, { $eq: [ "$$account.res.message", "Lead created successfully." ] }, dateRangeCondition ] }, then: "Accepted" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "RamFin" ] }, { $eq: [ "$$account.status", "Ineligible" ] }, dateRangeCondition ] }, then: "Rejected" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "RamFin" ] }, { $eq: [ "$$account.status", "Dedupe" ] }, dateRangeCondition ] }, then: "Deduped" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "RamFin" ] }, { $ne: [ "$$account.lead_status", null ] }, dateRangeCondition ] }, then: "Accepted" },
                                        // FATAKPAY CONDITIONS
                                        { case: { $and: [ { $eq: [ "$$account.name", "FatakPay" ] }, { $eq: [ "$$account.status", "Eligible" ] }, dateRangeCondition ] }, then: "Accepted" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "FatakPay" ] }, { $eq: [ "$$account.status", "Ineligible" ] }, dateRangeCondition ] }, then: "Rejected" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "FatakPay" ] }, { $eq: [ "$$account.status", "Deduped" ] }, dateRangeCondition ] }, then: "Deduped" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "FatakPay" ] }, { $ne: [ "$$account.stage_name", null ] }, dateRangeCondition ] }, then: "Accepted" },
                                        // SMARTCOIN CONDITIONS
                                        { case: { $and: [ { $eq: [ "$$account.name", "SmartCoin" ] }, { $eq: [ "$$account.isDuplicateLead", "true" ] }, dateRangeCondition ] }, then: "Deduped" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "SmartCoin" ] }, { $eq: [ "$$account.isDuplicateLead", "false" ] }, dateRangeCondition ] }, then: "Accepted" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "SmartCoin" ] }, { $eq: [ "$$account.message", "Lead created successfully" ] }, dateRangeCondition ] }, then: "Accepted" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "SmartCoin" ] }, { $regexMatch: { input: "$$account.message", regex: /(mandatory)/i } }, dateRangeCondition ] }, then: "Errors" },
                                        // ZYPE CONDITIONS
                                        { case: { $and: [ { $eq: [ "$$account.name", "Zype" ] }, { $eq: [ "$$account.status", "ACCEPT" ] }, dateRangeCondition ] }, then: "Accepted" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Zype" ] }, { $eq: [ "$$account.message", "REJECT" ] }, dateRangeCondition ] }, then: "Rejected" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Zype" ] }, { $eq: [ "$$account.status", "REJECT" ] }, dateRangeCondition ] }, then: "Rejected" },
                                        // CASHE CONDITIONS
                                        { case: { $and: [ { $eq: [ "$$account.name", "Cashe" ] }, { $eq: [ "$$account.status", "pre_approved" ] }, dateRangeCondition ] }, then: "Accepted" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Cashe" ] }, { $eq: [ "$$account.status", "pre_qualified_low" ] }, dateRangeCondition ] }, then: "Accepted" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Cashe" ] }, { $eq: [ "$$account.status", "rejected" ] }, dateRangeCondition ] }, then: "Rejected" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Cashe" ] }, { $regexMatch: { input: "$$account.res.status", regex: /(ERROR)/i } }, dateRangeCondition ] }, then: "Erros" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Cashe" ] }, { $eq: [ "$$account.res.payload.status", "rejected" ] }, dateRangeCondition ] }, then: "Rejected" },
                                        // MPOCKET CONDITIONS
                                        { case: { $and: [ { $eq: [ "$$account.name", "Mpocket" ] }, { $eq: [ "$$account.message", "User Eligible for Loan" ] }, dateRangeCondition ] }, then: "Accepted" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Mpocket" ] }, { $eq: [ "$$account.message", "New User" ] }, dateRangeCondition ] }, then: "Accepted" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Mpocket" ] }, { $eq: [ "$$account.message", "Data Accepted Successfully" ] }, dateRangeCondition ] }, then: "Accepted" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Mpocket" ] }, { $eq: [ "$$account.message", "User Profile Rejected on System" ] }, dateRangeCondition ] }, then: "Rejected" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Mpocket" ] }, { $eq: [ "$$account.message", "User Not Eligible for Loan" ] }, dateRangeCondition ] }, then: "Rejected" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "Mpocket" ] }, { $or: [ { $eq: [ "$$account.message", null ] }, { $not: [ "$$account.message" ] } ] }, dateRangeCondition ] }, then: "Rejected" },
                                        // MONEYVIEW CONDITIONS
                                        { case: { $and: [ { $eq: [ "$$account.name", "MoneyView" ] }, { $or: [ { $eq: [ "$$account.message", null ] }, { $not: [ "$$account.message" ] } ] }, dateRangeCondition ] }, then: "Rejected" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "MoneyView" ] }, { $eq: [ "$$account.message", "Lead has been rejected." ] }, dateRangeCondition ] }, then: "Rejected" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "MoneyView" ] }, { $regexMatch: { input: "$$account.message", regex: /(nvalid)/i } }, dateRangeCondition ] }, then: "Erros" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "MoneyView" ] }, { $eq: [ "$$account.message", "Lead has been expired." ] }, dateRangeCondition ] }, then: "Rejected" },
                                        { case: { $and: [ { $eq: [ "$$account.name", "MoneyView" ] }, { $eq: [ "$$account.message", "success" ] }, dateRangeCondition ] }, then: "Accepted" },
                                    ],
                                    default: "Rest",
                                },
                            },
                        },
                    },
                },
            },
        },
        { $unwind: "$lenderStatuses" },
        { $group: { _id: { lender: "$lenderStatuses.lender", status: "$lenderStatuses.status" }, count: { $sum: 1 } } },
        { $group: { _id: "$_id.lender", counts: { $push: { status: "$_id.status", count: "$count" } } } },
        { $project: { _id: 0, lender: "$_id", counts: 1 } },
    ]);

    {
        console.log(JSON.stringify(counts));
        const endTime = process.hrtime(startTime);
        const elapsedTimeInMs = endTime[0] * 1000 + endTime[1] / 1e6;
        if (elapsedTimeInMs >= 60000) {
            console.log(`Aggregation Time: ${(elapsedTimeInMs / 60000).toFixed(2)} mins`);
        } else if (elapsedTimeInMs >= 1000) {
            console.log(`Aggregation Time: ${(elapsedTimeInMs / 1000).toFixed(2)} secs`);
        } else {
            console.log(`Aggregation Time: ${elapsedTimeInMs.toFixed(2)} ms`);
        }
        process.exit(0);
    }
}

getCounts();
