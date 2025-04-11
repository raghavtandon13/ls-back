const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;

const startDate = new Date("2024-01-01");
const endDate = new Date("2026-01-31");
const specifiedLender = "SmartCoin";

mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

async function getLenderStats() {
    console.log("Getting lender stats...");
    const startTime = process.hrtime();
    const stats = await User.aggregate([
        {
            $match: {
                "accounts.resp_date": {
                    $gte: startDate,
                    $lte: endDate,
                },
                "accounts.name": specifiedLender,
            },
        },
        { $unwind: "$accounts" },
        {
            $match: {
                "accounts.resp_date": {
                    $gte: startDate,
                    $lte: endDate,
                },
                "accounts.name": specifiedLender,
            },
        },
        {
            $addFields: {
                lenderStatus: {
                    $switch: {
                        branches: [
                            // FIBE CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Fibe"] },
                                        { $eq: ["$accounts.res.reason", "customer lead created"] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Fibe"] },
                                        { $eq: ["$accounts.res.reason", "customer lead updated"] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Fibe"] },
                                        {
                                            $regexMatch: {
                                                input: "$accounts.res.reason",
                                                regex: /(salary|pincode|Pan|Age|Invalid)/i,
                                            },
                                        },
                                    ],
                                },
                                then: "Rejected",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Fibe"] },
                                        { $eq: ["$accounts.res.reason", "customer already exists"] },
                                    ],
                                },
                                then: "Deduped",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Fibe"] },
                                        { $eq: ["$accounts.res.reason", "Duplicate request"] },
                                    ],
                                },
                                then: "Deduped",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Fibe"] },
                                        { $ne: ["$accounts.res.errorMessage", null] },
                                    ],
                                },
                                then: "Errors",
                            },
                            // RAMFIN CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "RamFin"] },
                                        { $eq: ["$accounts.msg", "Lead created successfully."] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "RamFin"] },
                                        { $eq: ["$accounts.res.message", "Lead created successfully."] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "RamFin"] },
                                        { $eq: ["$accounts.status", "Ineligible"] },
                                    ],
                                },
                                then: "Rejected",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "RamFin"] },
                                        { $eq: ["$accounts.status", "Dedupe"] },
                                    ],
                                },
                                then: "Deduped",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "RamFin"] },
                                        { $ne: ["$accounts.lead_status", null] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            // FATAKPAY CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "FatakPay"] },
                                        { $eq: ["$accounts.status", "Eligible"] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "FatakPay"] },
                                        { $eq: ["$accounts.status", "Ineligible"] },
                                    ],
                                },
                                then: "Rejected",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "FatakPay"] },
                                        { $eq: ["$accounts.status", "Deduped"] },
                                    ],
                                },
                                then: "Deduped",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "FatakPay"] },
                                        { $ne: ["$accounts.stage_name", null] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            // SMARTCOIN CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "SmartCoin"] },
                                        { $eq: ["$accounts.isDuplicateLead", "true"] },
                                    ],
                                },
                                then: "Deduped",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "SmartCoin"] },
                                        { $eq: ["$accounts.isDuplicateLead", "false"] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "SmartCoin"] },
                                        { $eq: ["$accounts.message", "Lead created successfully"] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "SmartCoin"] },
                                        { $regexMatch: { input: "$accounts.message", regex: /(mandatory)/i } },
                                    ],
                                },
                                then: "Errors",
                            },
                            // ZYPE CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Zype"] },
                                        { $eq: ["$accounts.status", "ACCEPT"] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Zype"] },
                                        { $eq: ["$accounts.message", "REJECT"] },
                                    ],
                                },
                                then: "Rejected",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Zype"] },
                                        { $eq: ["$accounts.status", "REJECT"] },
                                    ],
                                },
                                then: "Rejected",
                            },
                            // CASHE CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Cashe"] },
                                        { $eq: ["$accounts.status", "pre_approved"] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Cashe"] },
                                        { $eq: ["$accounts.status", "pre_qualified_low"] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Cashe"] },
                                        { $eq: ["$accounts.status", "rejected"] },
                                    ],
                                },
                                then: "Rejected",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Cashe"] },
                                        { $regexMatch: { input: "$accounts.res.status", regex: /(ERROR)/i } },
                                    ],
                                },
                                then: "Errors",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Cashe"] },
                                        { $eq: ["$accounts.res.payload.status", "rejected"] },
                                    ],
                                },
                                then: "Rejected",
                            },
                            // MPOCKET CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Mpocket"] },
                                        { $eq: ["$accounts.message", "User Eligible for Loan"] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Mpocket"] },
                                        { $eq: ["$accounts.message", "New User"] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Mpocket"] },
                                        { $eq: ["$accounts.message", "Data Accepted Successfully"] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Mpocket"] },
                                        { $eq: ["$accounts.message", "User Profile Rejected on System"] },
                                    ],
                                },
                                then: "Rejected",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Mpocket"] },
                                        { $eq: ["$accounts.message", "User Not Eligible for Loan"] },
                                    ],
                                },
                                then: "Rejected",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Mpocket"] },
                                        {
                                            $or: [
                                                { $eq: ["$accounts.message", null] },
                                                { $not: ["$accounts.message"] },
                                            ],
                                        },
                                    ],
                                },
                                then: "Rejected",
                            },
                            // MONEYVIEW CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "MoneyView"] },
                                        {
                                            $or: [
                                                { $eq: ["$accounts.message", null] },
                                                { $not: ["$accounts.message"] },
                                            ],
                                        },
                                    ],
                                },
                                then: "Rejected",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "MoneyView"] },
                                        { $eq: ["$accounts.message", "Lead has been rejected."] },
                                    ],
                                },
                                then: "Rejected",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "MoneyView"] },
                                        { $regexMatch: { input: "$accounts.message", regex: /(nvalid)/i } },
                                    ],
                                },
                                then: "Errors",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "MoneyView"] },
                                        { $eq: ["$accounts.message", "Lead has been expired."] },
                                    ],
                                },
                                then: "Rejected",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "MoneyView"] },
                                        { $eq: ["$accounts.message", "success"] },
                                    ],
                                },
                                then: "Accepted",
                            },

                            // LOANTAP CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "LoanTap"] },
                                        { $eq: ["$accounts.message", "Application created successfully"] },
                                    ],
                                },
                                then: "Accepted",
                            },
                        ],
                        default: "Rest",
                    },
                },
            },
        },
        {
            $group: {
                _id: { lender: "$accounts.name", status: "$lenderStatus" },
                count: { $sum: 1 },
                avgIncome: { $avg: { $toDouble: "$income" } },
            },
        },
        {
            $group: {
                _id: "$_id.lender",
                counts: { $push: { status: "$_id.status", count: "$count", avgIncome: "$avgIncome" } },
            },
        },
        {
            $project: {
                _id: 0,
                lender: "$_id",
                counts: 1,
            },
        },
        {
            $lookup: {
                from: "users",
                let: { lender: "$lender" },
                pipeline: [
                    { $unwind: "$accounts" },
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$accounts.name", "$$lender"] },
                                    { $gte: ["$accounts.resp_date", startDate] },
                                    { $lte: ["$accounts.resp_date", endDate] },
                                ],
                            },
                        },
                    },
                    {
                        $addFields: {
                            lenderStatus: {
                                $switch: {
                                    branches: [
                                        {
                                            case: {
                                                $and: [
                                                    { $eq: ["$accounts.name", "SmartCoin"] },
                                                    { $eq: ["$accounts.isDuplicateLead", "true"] },
                                                ],
                                            },
                                            then: "Deduped",
                                        },
                                        {
                                            case: {
                                                $and: [
                                                    { $eq: ["$accounts.name", "SmartCoin"] },
                                                    { $eq: ["$accounts.isDuplicateLead", "false"] },
                                                ],
                                            },
                                            then: "Accepted",
                                        },
                                        {
                                            case: {
                                                $and: [
                                                    { $eq: ["$accounts.name", "SmartCoin"] },
                                                    { $eq: ["$accounts.message", "Lead created successfully"] },
                                                ],
                                            },
                                            then: "Accepted",
                                        },
                                        {
                                            case: {
                                                $and: [
                                                    { $eq: ["$accounts.name", "SmartCoin"] },
                                                    {
                                                        $regexMatch: {
                                                            input: "$accounts.message",
                                                            regex: /(mandatory)/i,
                                                        },
                                                    },
                                                ],
                                            },
                                            then: "Errors",
                                        },
                                    ],
                                    default: "Rest",
                                },
                            },
                        },
                    },
                    {
                        $group: {
                            _id: { partner: "$partner", status: "$lenderStatus" },
                            count: { $sum: 1 },
                            avgIncome: { $avg: { $toDouble: "$income" } },
                        },
                    },
                    {
                        $group: {
                            _id: "$_id.partner",
                            counts: { $push: { status: "$_id.status", count: "$count", avgIncome: "$avgIncome" } },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            partner: "$_id",
                            counts: 1,
                        },
                    },
                ],
                as: "partnerStats",
            },
        },
    ]);
    console.log(JSON.stringify(stats, null, 2));
    console.log(JSON.stringify(stats));
    const endTime = process.hrtime(startTime);
    const elapsedTimeInMs = endTime[0] * 1000 + endTime[1] / 1e6;
    if (elapsedTimeInMs >= 60000) {
        console.log(`Aggregation Time: ${(elapsedTimeInMs / 60000).toFixed(2)} mins`);
    } else {
        console.log(`Aggregation Time: ${(elapsedTimeInMs / 1000).toFixed(2)} secs`);
    }
    process.exit(0);
}

getLenderStats();
