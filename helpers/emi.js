const mongoose = require("mongoose");
const User = require("../models/user.model");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const pLimit = require("p-limit").default;
require("dotenv").config();

const API_URL = `https://credmantra.com/api/v1/partner-api`;
const MONGODB_URI = process.env.MONGODB_URI;
const PROGRESS_FILE = path.join(__dirname, "progress.txt");
const LOG_FILE = path.join(__dirname, "script_log.txt");

mongoose.connect(MONGODB_URI);

function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(LOG_FILE, logMessage + "\n");
}

function getProgress() {
    if (fs.existsSync(PROGRESS_FILE)) {
        return parseInt(fs.readFileSync(PROGRESS_FILE, "utf-8")) || 0;
    }
    return 0;
}

function saveProgress(lineNumber) {
    fs.writeFileSync(PROGRESS_FILE, lineNumber.toString());
}

function isDisbursalDateValid(disbursalDate) {
    const today = new Date();
    const date = new Date(disbursalDate);
    const difference = Math.floor((today - date) / (1000 * 60 * 60 * 24)); // Difference in days
    return difference >= 7;
}

async function processLead(lead) {
    const phone = lead.mobile;

    try {
        const user = await User.findOne({ phone }).select("name phone email dob pan").lean();
        if (user) {
            const result = await ramInject(user);

            await User.updateOne({ _id: user._id }, { $set: { ref: "ramRerun7days" } });
            logToFile(`Processed lead for phone ${phone}: ${JSON.stringify(result)}`);
        } else {
            logToFile(`User not found in MongoDB for phone ${phone}`);
        }
    } catch (err) {
        logToFile(`Error processing phone ${phone}: ${err.message}`);
    }
}

async function ramInject(lead) {
    const ramReq = {
        name: lead.name,
        mobile: lead.phone,
        loanAmount: "200000",
        email: lead.email,
        employeeType: "Salaried",
        dob: lead.dob,
        pancard: lead.pan,
    };

    try {
        const ramRes = await axios.post(`${API_URL}/ram/create`, ramReq);
        if (ramRes.data.status === 1) {
            const ramRes2 = await axios.post(`${API_URL}/ram/status`, { mobile: lead.phone });
            return ramRes2.data;
        }
        return ramRes.data;
    } catch (error) {
        const errorMessage = error.response?.data?.msg || error.message;
        return { error: errorMessage };
    }
}

async function main() {
    const progress = getProgress();
    const csvFilePath = path.join(__dirname, "mis.csv");
    const limit = pLimit(5);
    let lineNumber = 0;

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", async (row) => {
            lineNumber++;
            if (lineNumber <= progress) return;

            const { mobile, disbursalDate } = row;

            if (disbursalDate && isDisbursalDateValid(disbursalDate)) {
                await limit(() => processLead({ mobile, disbursalDate }));
            }
            saveProgress(lineNumber);
        })
        .on("end", () => {
            logToFile("Processing complete.");
            mongoose.connection.close();
        })
        .on("error", (err) => {
            logToFile(`Error reading CSV: ${err.message}`);
        });
}

main().catch((err) => {
    logToFile(`Fatal error: ${err.message}`);
    mongoose.connection.close();
});
