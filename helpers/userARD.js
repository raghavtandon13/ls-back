require("dotenv").config();
const chalk = require("chalk").default;
const MONGODB_URI = process.env.MONGODB_URI;
const mongoose = require("mongoose");
const ora = require("ora").default;
const Table = require("cli-table3");
const User = require("../models/user.model");

const args = require("minimist")(process.argv.slice(2));

if (!args.phone) {
    console.error("Error: --phone argument is required.");
    process.exit(1);
}

const phone = args.phone;

mongoose.connect(MONGODB_URI).catch((err) => console.error("MongoDB connection error:", err));

async function getLenderStatuses() {
    const spinner = ora("Getting lender statuses...").start();
    const startTime = process.hrtime();
    const user = await User.findOne({ phone }).catch((err) => {
        console.error("Error fetching user:", err);
        process.exit(1);
    });

    if (!user) {
        console.error("Error: User not found.");
        process.exit(1);
    }

    const lenderStatuses = user.accounts.map((account) => {
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

    spinner.stop();
    const table = new Table({ head: ["Lender", "Status"] });

    lenderStatuses.forEach((lenderStatus) => {
        table.push([lenderStatus.lender, lenderStatus.status]);
    });

    console.clear();
    console.log(`Phone: ${chalk.blue(phone)}`);
    console.log(table.toString());
    const endTime = process.hrtime(startTime);
    const elapsedTimeInMs = endTime[0] * 1000 + endTime[1] / 1e6;
    if (elapsedTimeInMs >= 60000) console.log(`Aggregation Time: ${(elapsedTimeInMs / 60000).toFixed(2)} mins`);
    else if (elapsedTimeInMs >= 1000) console.log(`Aggregation Time: ${(elapsedTimeInMs / 1000).toFixed(2)} secs`);
    else console.log(`Aggregation Time: ${chalk.green(elapsedTimeInMs.toFixed(2), "ms")}`);
    process.exit(0);
}

getLenderStatuses();
