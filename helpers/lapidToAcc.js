const fs = require("fs");
const readline = require("readline");
const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI);

const conditions = [
    {
        name: "Fibe",
        dateField: "res.responseDate",
        conditions: [
            { check: (account) => account.res?.reason === "customer lead updated", result: "Accepted" },
            { check: (account) => /(salary|pincode|Pan|Age|Invalid)/i.test(account.res?.reason), result: "Rejected" },
            { check: (account) => account.res?.reason === "customer already exists", result: "Deduped" },
            { check: (account) => account.res?.reason === "Duplicate request", result: "Deduped" },
            { check: (account) => account.res?.errorMessage !== null, result: "Errors" },
        ],
    },
    {
        name: "RamFin",
        dateField: "resp_date",
        conditions: [
            { check: (account) => account.msg === "Lead created successfully.", result: "Accepted" },
            { check: (account) => account.res?.message === "Lead created successfully.", result: "Accepted" },
            { check: (account) => account.status === "Ineligible", result: "Rejected" },
            { check: (account) => account.status === "Dedupe", result: "Deduped" },
            { check: (account) => account.lead_status !== null, result: "Accepted" },
        ],
    },
    {
        name: "FatakPay",
        dateField: "resp_date",
        conditions: [
            { check: (account) => account.status === "Eligible", result: "Accepted" },
            { check: (account) => account.status === "Ineligible", result: "Rejected" },
            { check: (account) => account.status === "Deduped", result: "Deduped" },
            { check: (account) => account.stage_name !== null, result: "Accepted" },
        ],
    },
    {
        name: "SmartCoin",
        dateField: "resp_date",
        conditions: [
            { check: (account) => account.isDuplicateLead === "true", result: "Deduped" },
            { check: (account) => account.isDuplicateLead === "false", result: "Accepted" },
            { check: (account) => account.message === "Lead created successfully", result: "Accepted" },
            { check: (account) => /(mandatory)/i.test(account.message), result: "Errors" },
        ],
    },
    {
        name: "Zype",
        dateField: "resp_date",
        conditions: [
            { check: (account) => account.status === "ACCEPT", result: "Accepted" },
            { check: (account) => account.message === "REJECT", result: "Rejected" },
            { check: (account) => account.status === "REJECT", result: "Rejected" },
        ],
    },
    {
        name: "Cashe",
        dateField: "resp_date",
        conditions: [
            { check: (account) => account.status === "pre_approved", result: "Accepted" },
            { check: (account) => account.status === "pre_qualified_low", result: "Accepted" },
            { check: (account) => account.status === "rejected", result: "Rejected" },
            { check: (account) => /(ERROR)/i.test(account.res?.status), result: "Errors" },
            { check: (account) => account.res?.payload?.status === "rejected", result: "Rejected" },
        ],
    },
    {
        name: "Mpocket",
        dateField: "resp_date",
        conditions: [
            { check: (account) => account.message === "User Eligible for Loan", result: "Accepted" },
            { check: (account) => account.message === "New User", result: "Accepted" },
            { check: (account) => account.message === "Data Accepted Successfully", result: "Accepted" },
            { check: (account) => account.message === "User Profile Rejected on System", result: "Rejected" },
            { check: (account) => account.message === "User Not Eligible for Loan", result: "Rejected" },
            { check: (account) => account.message === null || !account.message, result: "Rejected" },
        ],
    },
    {
        name: "MoneyView",
        dateField: "resp_date",
        conditions: [
            { check: (account) => account.message === null || !account.message, result: "Rejected" },
            { check: (account) => account.message === "Lead has been rejected.", result: "Rejected" },
            { check: (account) => /(nvalid)/i.test(account.message), result: "Errors" },
            { check: (account) => account.message === "Lead has been expired.", result: "Rejected" },
            { check: (account) => account.message === "success", result: "Accepted" },
        ],
    },
];

async function processLapId(lapId, writeStream) {
    console.time(`Process LapId ${lapId}`);

    console.time(`Find User ${lapId}`);
    const user = await User.findOne({
        "accounts.loan_application_id": parseInt(lapId),
    }).select("phone accounts");
    console.timeEnd(`Find User ${lapId}`);

    if (!user) {
        console.timeEnd(`Process LapId ${lapId}`);
        return;
    }

    console.time(`Filter Accepted Lenders ${lapId}`);
    const acceptedLenders = user.accounts
        .filter((account) => {
            const lenderConditions = conditions.find((cond) => cond.name === account.name);
            if (!lenderConditions) return false;

            const condition = lenderConditions.conditions.find((cond) => cond.check(account));
            return condition && condition.result === "Accepted";
        })
        .map((account) => {
            const lenderConditions = conditions.find((cond) => cond.name === account.name);
            const dateField = lenderConditions.dateField.split(".").reduce((o, i) => o?.[i], account);
            return { name: account.name, date: dateField };
        });
    console.timeEnd(`Filter Accepted Lenders ${lapId}`);

    const result = {
        phone: user.phone,
        acceptedLenders: acceptedLenders,
    };
    console.log(JSON.stringify(result));

    console.time(`Write to File ${lapId}`);
    writeStream.write(JSON.stringify(result) + "\n");
    console.timeEnd(`Write to File ${lapId}`);

    console.timeEnd(`Process LapId ${lapId}`);
}

async function processLapIds(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    const writeStream = fs.createWriteStream("results2.json", { flags: "a" });

    const lapIdPromises = [];
    for await (const lapId of rl) {
        lapIdPromises.push(processLapId(lapId, writeStream));
        if (lapIdPromises.length >= 1) {
            // Adjust the concurrency level as needed
            await Promise.all(lapIdPromises);
            lapIdPromises.length = 0; // Clear the array
        }
    }

    // Process any remaining lapIds
    if (lapIdPromises.length > 0) {
        await Promise.all(lapIdPromises);
    }

    writeStream.end();
    console.log("Processing complete.");
    process.exit(0);
}

processLapIds("LapIDFP3.txt").then(() => {
    mongoose.connection.close();
});
