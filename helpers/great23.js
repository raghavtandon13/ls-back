const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;

let lender = "SmartCoin";
let partner = "Zype_LS";
let group = "employment"; // "gender", "age", or "employment"
const startDate = new Date("2025-01-01");
const endDate = new Date("2025-01-31");

mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

async function getCounts() {
    console.log("Getting counts...");
    const startTime = process.hrtime();

    // CONDITIONS
    const matchConditions = { "accounts.resp_date": { $gte: startDate, $lte: endDate } };
    if (lender) matchConditions["accounts.name"] = lender;
    if (partner) matchConditions["partner"] = partner;

    // AGG
    const counts = await User.aggregate([
        { $match: matchConditions },
        { $unwind: "$accounts" },
        { $match: matchConditions },
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
                age: {
                    $cond: {
                        if: { $eq: [group, "age"] },
                        then: {
                            $subtract: [{ $year: new Date() }, { $year: { $dateFromString: { dateString: "$dob" } } }],
                        },
                        else: null,
                    },
                },
                ageGroup: {
                    $cond: {
                        if: { $eq: [group, "age"] },
                        then: {
                            $concat: [
                                {
                                    $toString: {
                                        $subtract: [
                                            {
                                                $subtract: [
                                                    { $year: new Date() },
                                                    { $year: { $dateFromString: { dateString: "$dob" } } },
                                                ],
                                            },
                                            {
                                                $mod: [
                                                    {
                                                        $subtract: [
                                                            { $year: new Date() },
                                                            { $year: { $dateFromString: { dateString: "$dob" } } },
                                                        ],
                                                    },
                                                    5,
                                                ],
                                            },
                                        ],
                                    },
                                },
                                "-",
                                {
                                    $toString: {
                                        $add: [
                                            {
                                                $subtract: [
                                                    {
                                                        $subtract: [
                                                            { $year: new Date() },
                                                            { $year: { $dateFromString: { dateString: "$dob" } } },
                                                        ],
                                                    },
                                                    {
                                                        $mod: [
                                                            {
                                                                $subtract: [
                                                                    { $year: new Date() },
                                                                    {
                                                                        $year: {
                                                                            $dateFromString: { dateString: "$dob" },
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                            5,
                                                        ],
                                                    },
                                                ],
                                            },
                                            5,
                                        ],
                                    },
                                },
                            ],
                        },
                        else: null,
                    },
                },
            },
        },
        {
            $group: {
                _id: {
                    lender: "$accounts.name",
                    status: "$lenderStatus",
                    group: {
                        $cond: {
                            if: { $eq: [group, "age"] },
                            then: "$ageGroup",
                            else: {
                                $cond: { if: { $eq: [group, "employment"] }, then: "$employment", else: "$gender" },
                            },
                        },
                    },
                },
                count: { $sum: 1 },
            },
        },
        {
            $group: {
                _id: { lender: "$_id.lender", group: "$_id.group" },
                counts: { $push: { status: "$_id.status", count: "$count" } },
            },
        },
        {
            $group: {
                _id: "$_id.lender",
                groupCounts: { $push: { group: "$_id.group", counts: "$counts" } },
            },
        },
        {
            $project: {
                _id: 0,
                lender: "$_id",
                groupCounts: 1,
            },
        },
    ]);
    console.log(JSON.stringify(counts, null, 2));

    // TIME
    const endTime = process.hrtime(startTime);
    const elapsedTimeInMs = endTime[0] * 1000 + endTime[1] / 1e6;
    if (elapsedTimeInMs >= 60000) console.log(`Aggregation Time:${(elapsedTimeInMs / 60000).toFixed(2)}mins`);
    else if (elapsedTimeInMs >= 1000) console.log(`Aggregation Time:${(elapsedTimeInMs / 1000).toFixed(2)}secs`);
    else console.log(`Aggregation Time:${elapsedTimeInMs.toFixed(2)}ms`);
    process.exit(0);
}

getCounts();
