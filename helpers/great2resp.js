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

// Allocation time for each account in days
const allocationTime = {
    RamFin: 30,
    SmartCoin: 30,
    FatakPay: 30,
    Zype: 30,
    Mpocket: 30,
};
function getAllocationTime(lender) {
    return new Date(new Date().setDate(new Date().getDate() - allocationTime[lender]));
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
                            // RAMFIN CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "RamFin"] },
                                        { $eq: ["$accounts.msg", "Lead created successfully."] },
                                        { $gte: ["$accounts.resp_date", getAllocationTime("RamFin")] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "RamFin"] },
                                        { $eq: ["$accounts.res.message", "Lead created successfully."] },
                                        { $gte: ["$accounts.resp_date", getAllocationTime("RamFin")] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "RamFin"] },
                                        { $ne: ["$accounts.lead_status", null] },
                                        { $gte: ["$accounts.resp_date", getAllocationTime("RamFin")] },
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
                                        { $gte: ["$accounts.resp_date", getAllocationTime("FatakPay")] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "FatakPay"] },
                                        { $ne: ["$accounts.stage_name", null] },
                                        { $gte: ["$accounts.resp_date", getAllocationTime("FatakPay")] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            // SMARTCOIN CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "SmartCoin"] },
                                        { $eq: ["$accounts.isDuplicateLead", "false"] },
                                        { $gte: ["$accounts.resp_date", getAllocationTime("SmartCoin")] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "SmartCoin"] },
                                        { $eq: ["$accounts.message", "Lead created successfully"] },
                                        { $gte: ["$accounts.resp_date", getAllocationTime("SmartCoin")] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            // ZYPE CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Zype"] },
                                        { $eq: ["$accounts.status", "ACCEPT"] },
                                        { $gte: ["$accounts.resp_date", getAllocationTime("Zype")] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            // MPOCKET CONDITIONS
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Mpocket"] },
                                        { $eq: ["$accounts.message", "User Eligible for Loan"] },
                                        { $gte: ["$accounts.resp_date", getAllocationTime("Mpocket")] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Mpocket"] },
                                        { $eq: ["$accounts.message", "New User"] },
                                        { $gte: ["$accounts.resp_date", getAllocationTime("Mpocket")] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Mpocket"] },
                                        { $eq: ["$accounts.message", "Data Accepted Successfully"] },
                                        { $gte: ["$accounts.resp_date", getAllocationTime("Mpocket")] },
                                    ],
                                },
                                then: "Accepted",
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ["$accounts.name", "Mpocket"] },
                                        { $eq: ["$accounts.message", "User Not Eligible for Loan"] },
                                        { $gte: ["$accounts.resp_date", getAllocationTime("Mpocket")] },
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
                                        { $gte: ["$accounts.resp_date", getAllocationTime("Mpocket")] },
                                    ],
                                },
                                then: "Rejected",
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
    const table = new Table({ head: ["Lender", "Accepted", "Rejected"] });

    counts.forEach((lender) => {
        const statusCounts = { Accepted: 0, Rejected: 0 };
        lender.counts.forEach((statusCount) => (statusCounts[statusCount.status] = statusCount.count));
        table.push([
            lender.lender,
            formatNumberIndianStyle(statusCounts.Accepted),
            formatNumberIndianStyle(statusCounts.Rejected),
        ]);
    });
    console.clear();
    console.log(`${chalk.green("Eligible for punching again.")}`);
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
