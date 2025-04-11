require("dotenv").config();
const chalk = require("chalk").default;
const MONGODB_URI = process.env.MONGODB_URI;
const mongoose = require("mongoose");
const ora = require("ora").default;
const Table = require("cli-table3");
const User = require("../models/user.model");

const args = require("minimist")(process.argv.slice(2));

if (!args.start || !args.end) {
    console.error("Error: --start and --end arguments are required.");
    process.exit(1);
}

const startDate = new Date(args.start);
const endDate = new Date(args.end);
const partner = args.partner || null;

mongoose.connect(MONGODB_URI).catch((err) => console.error("MongoDB connection error:", err));

function formatNumberIndianStyle(number) {
    const x = number.toString().split(".");
    let lastThree = x[0].substring(x[0].length - 3);
    const otherNumbers = x[0].substring(0, x[0].length - 3);
    if (otherNumbers !== "") lastThree = "," + lastThree;
    const result = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
    return x.length > 1 ? result + "." + x[1] : result;
}

async function getCounts() {
    const spinner = ora("Getting counts...").start();
    const startTime = process.hrtime();
    const counts = await User.aggregate([
        { $match: { "accounts.resp_date": { $gte: startDate, $lte: endDate } } },
        ...(partner ? [{ $match: { partner } }] : []),
        { $unwind: "$accounts" },
        { $match: { "accounts.resp_date": { $gte: startDate } } },
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

                            // CreditLinks CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "CreditLinks"] },
                                        { $eq: ["$accounts.message", "Not eligible"] },
                                    ],
                                },
                                then: "Rejected",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "CreditLinks"] },
                                        { $ne: ["$accounts.leadId", null] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "CreditLinks"] },
                                        { $eq: ["$accounts.message", "Eligible"] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            // lendenclub CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "LenDenClub"] },
                                        { $eq: ["$accounts.is_duplicate", true] },
                                    ],
                                },
                                then: "Deduped",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "LenDenClub"] },
                                        { $eq: ["$accounts.is_duplicate", false] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            // LendingPlate CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "LendingPlate"] },
                                        { $eq: ["$accounts.message", "Success"] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "LendingPlate"] },
                                        { $eq: ["$accounts.message", "Existing user"] },
                                    ],
                                },
                                then: "Deduped",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "LendingPlate"] },
                                        { $eq: ["$accounts.message", "INELIGIBLE"] },
                                    ],
                                },
                                then: "Rejected",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "LendingPlate"] },
                                        {
                                            $or: [
                                                { $eq: ["$accounts.message", "Error"] },
                                                { $eq: ["$accounts.message", "Fail"] },
                                                {
                                                    $regexMatch: {
                                                        input: "$accounts.message",
                                                        regex: "failed",
                                                        options: "i",
                                                    },
                                                },
                                            ],
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
        { $group: { _id: { lender: "$accounts.name", status: "$lenderStatus" }, count: { $sum: 1 } } },
        { $group: { _id: "$_id.lender", counts: { $push: { status: "$_id.status", count: "$count" } } } },
        { $project: { _id: 0, lender: "$_id", counts: 1 } },
    ]);
    spinner.stop();
    const table = new Table({ head: ["Lender", "Accepted", "Rejected", "Deduped", "Errors", "Rest"] });

    counts.forEach((lender) => {
        const statusCounts = { Accepted: 0, Rejected: 0, Deduped: 0, Errors: 0, Rest: 0 };
        lender.counts.forEach((statusCount) => (statusCounts[statusCount.status] = statusCount.count));
        table.push([
            lender.lender,
            formatNumberIndianStyle(statusCounts.Accepted),
            formatNumberIndianStyle(statusCounts.Rejected),
            formatNumberIndianStyle(statusCounts.Deduped),
            formatNumberIndianStyle(statusCounts.Errors),
            formatNumberIndianStyle(statusCounts.Rest),
        ]);
    });
    // console.clear();
    console.log(`Start Date: ${chalk.blue(startDate.toISOString().split("T")[0])}`);
    console.log(`End Date: ${chalk.blue(endDate.toISOString().split("T")[0])}`);
    if (partner) console.log(`Partner: ${chalk.green(partner)}`);
    console.log(table.toString());
    const endTime = process.hrtime(startTime);
    const elapsedTimeInMs = endTime[0] * 1000 + endTime[1] / 1e6;
    if (elapsedTimeInMs >= 60000) console.log(`Aggregation Time: ${(elapsedTimeInMs / 60000).toFixed(2)} mins`);
    else if (elapsedTimeInMs >= 1000) console.log(`Aggregation Time: ${(elapsedTimeInMs / 1000).toFixed(2)} secs`);
    else console.log(`Aggregation Time: ${chalk.green(elapsedTimeInMs.toFixed(2), ms)}`);
    process.exit(0);
}

getCounts();
