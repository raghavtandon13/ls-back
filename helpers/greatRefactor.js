require("dotenv").config();
const chalk = require("chalk").default;
const mongoose = require("mongoose");
const ora = require("ora").default;
const Table = require("cli-table3");
const User = require("../models/user.model");
const args = require("minimist")(process.argv.slice(2));

const MONGODB_URI = process.env.MONGODB_URI;
const startDate = new Date(args.start);
const endDate = new Date(args.end);
const partner = args.partner || null;

if (!args.start || !args.end) {
    console.error("Error: --start and --end arguments are required.");
    process.exit(1);
}

mongoose.connect(MONGODB_URI).catch((err) => console.error("MongoDB connection error:", err));

const LENDERS = {
    FIBE: "Fibe",
    RAMFIN: "RamFin",
    FATAKPAY: "FatakPay",
    SMARTCOIN: "SmartCoin",
    ZYPE: "Zype",
    CASHE: "Cashe",
    MPOCKET: "Mpocket",
    MONEYVIEW: "MoneyView",
    LOANTAP: "LoanTap",
    CREDITLINKS: "CreditLinks",
    LENDENCLUB: "LenDenClub",
};

const STATUSES = { ACCEPTED: "Accepted", REJECTED: "Rejected", DEDUPED: "Deduped", ERRORS: "Errors", REST: "Rest" };

function formatNumberIndianStyle(number) {
    const [integer, decimal] = number.toString().split(".");
    const lastThree = integer.slice(-3);
    const otherNumbers = integer.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    return otherNumbers + (otherNumbers ? "," : "") + lastThree + (decimal ? "." + decimal : "");
}

function getLenderStatus(account) {
    const { name, res, msg, status, lead_status, stage_name, isDuplicateLead, is_duplicate, message, leadId } = account;

    const conditions = [
        {
            lender: LENDERS.FIBE,
            condition: res?.reason === "customer lead created" || res?.reason === "customer lead updated",
            status: STATUSES.ACCEPTED,
        },
        {
            lender: LENDERS.FIBE,
            condition: /(salary|pincode|Pan|Age|Invalid)/i.test(res?.reason),
            status: STATUSES.REJECTED,
        },
        {
            lender: LENDERS.FIBE,
            condition: res?.reason === "customer already exists" || res?.reason === "Duplicate request",
            status: STATUSES.DEDUPED,
        },
        { lender: LENDERS.FIBE, condition: res?.errorMessage, status: STATUSES.ERRORS },
        {
            lender: LENDERS.RAMFIN,
            condition:
                msg === "Lead created successfully." || res?.message === "Lead created successfully." || lead_status,
            status: STATUSES.ACCEPTED,
        },
        { lender: LENDERS.RAMFIN, condition: status === "Ineligible", status: STATUSES.REJECTED },
        { lender: LENDERS.RAMFIN, condition: status === "Dedupe", status: STATUSES.DEDUPED },
        { lender: LENDERS.FATAKPAY, condition: status === "Eligible", status: STATUSES.ACCEPTED },
        { lender: LENDERS.FATAKPAY, condition: status === "Ineligible", status: STATUSES.REJECTED },
        { lender: LENDERS.FATAKPAY, condition: status === "Deduped", status: STATUSES.DEDUPED },
        { lender: LENDERS.FATAKPAY, condition: stage_name, status: STATUSES.ACCEPTED },
        { lender: LENDERS.SMARTCOIN, condition: isDuplicateLead === "true", status: STATUSES.DEDUPED },
        {
            lender: LENDERS.SMARTCOIN,
            condition: isDuplicateLead === "false" || message === "Lead created successfully",
            status: STATUSES.ACCEPTED,
        },
        { lender: LENDERS.SMARTCOIN, condition: /(mandatory)/i.test(message), status: STATUSES.ERRORS },
        { lender: LENDERS.ZYPE, condition: status === "ACCEPT", status: STATUSES.ACCEPTED },
        { lender: LENDERS.ZYPE, condition: message === "REJECT" || status === "REJECT", status: STATUSES.REJECTED },
        {
            lender: LENDERS.CASHE,
            condition: status === "pre_approved" || status === "pre_qualified_low",
            status: STATUSES.ACCEPTED,
        },
        {
            lender: LENDERS.CASHE,
            condition: status === "rejected" || /(ERROR)/i.test(res?.status) || res?.payload?.status === "rejected",
            status: STATUSES.REJECTED,
        },
        {
            lender: LENDERS.MPOCKET,
            condition: ["User Eligible for Loan", "New User", "Data Accepted Successfully"].includes(message),
            status: STATUSES.ACCEPTED,
        },
        {
            lender: LENDERS.MPOCKET,
            condition: ["User Profile Rejected on System", "User Not Eligible for Loan"].includes(message) || !message,
            status: STATUSES.REJECTED,
        },
        {
            lender: LENDERS.MONEYVIEW,
            condition:
                !message ||
                message === "Lead has been rejected." ||
                /(nvalid)/i.test(message) ||
                message === "Lead has been expired.",
            status: STATUSES.REJECTED,
        },
        { lender: LENDERS.MONEYVIEW, condition: message === "success", status: STATUSES.ACCEPTED },
        {
            lender: LENDERS.LOANTAP,
            condition: message === "Application created successfully",
            status: STATUSES.ACCEPTED,
        },
        { lender: LENDERS.CREDITLINKS, condition: message === "Not eligible", status: STATUSES.REJECTED },
        { lender: LENDERS.CREDITLINKS, condition: leadId || message === "Eligible", status: STATUSES.ACCEPTED },
        {
            lender: LENDERS.LENDENCLUB,
            condition: is_duplicate,
            status: is_duplicate ? STATUSES.DEDUPED : STATUSES.ACCEPTED,
        },
    ];

    const matchedCondition = conditions.find((cond) => cond.lender === name && cond.condition);
    return matchedCondition ? matchedCondition.status : STATUSES.REST;
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
                lenderStatus: { $function: { body: getLenderStatus.toString(), args: ["$accounts"], lang: "js" } },
            },
        },
        { $group: { _id: { lender: "$accounts.name", status: "$lenderStatus" }, count: { $sum: 1 } } },
        { $group: { _id: "$_id.lender", counts: { $push: { status: "$_id.status", count: "$count" } } } },
        { $project: { _id: 0, lender: "$_id", counts: 1 } },
    ]);

    spinner.stop();

    const table = new Table({ head: ["Lender", "Accepted", "Rejected", "Deduped", "Errors", "Rest"] });

    counts.forEach(({ lender, counts }) => {
        const statusCounts = { Accepted: 0, Rejected: 0, Deduped: 0, Errors: 0, Rest: 0 };
        counts.forEach(({ status, count }) => (statusCounts[status] = count));
        table.push([
            lender,
            formatNumberIndianStyle(statusCounts.Accepted),
            formatNumberIndianStyle(statusCounts.Rejected),
            formatNumberIndianStyle(statusCounts.Deduped),
            formatNumberIndianStyle(statusCounts.Errors),
            formatNumberIndianStyle(statusCounts.Rest),
        ]);
    });

    console.log(`Start Date: ${chalk.blue(startDate.toISOString().split("T")[0])}`);
    console.log(`End Date: ${chalk.blue(endDate.toISOString().split("T")[0])}`);
    if (partner) console.log(`Partner: ${chalk.green(partner)}`);
    console.log(table.toString());

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const elapsedTimeInMs = seconds * 1000 + nanoseconds / 1e6;
    console.log(
        `Aggregation Time: ${elapsedTimeInMs >= 60000 ? (elapsedTimeInMs / 60000).toFixed(2) + " mins" : elapsedTimeInMs >= 1000 ? (elapsedTimeInMs / 1000).toFixed(2) + " secs" : elapsedTimeInMs.toFixed(2) + " ms"}`,
    );

    process.exit(0);
}

getCounts();
