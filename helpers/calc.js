const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
const LOG_FILE = path.join(__dirname, "script_log.txt");

mongoose.connect(MONGODB_URI);

function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(LOG_FILE, logMessage + "\n");
}

function getDaysDifference(disbursalDate) {
    const today = new Date();
    const date = new Date(disbursalDate);
    return Math.floor((today - date) / (1000 * 60 * 60 * 24)); // Difference in days
}

async function main() {
    const csvFilePath = path.join(__dirname, "mis.csv");
    const daysCount = {}; // Object to hold counts for each day

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (row) => {
            const { disbursalDate } = row;

            if (disbursalDate) {
                const daysDiff = getDaysDifference(disbursalDate);

                if (daysDiff >= 7) {
                    daysCount[daysDiff] = (daysCount[daysDiff] || 0) + 1; // Increment count for the day
                }
            }
        })
        .on("end", () => {
            logToFile("Disbursal date analysis complete.");
            logToFile("Days count summary:");

            Object.keys(daysCount)
                .sort((a, b) => a - b) // Sort by days
                .forEach((day) => {
                    logToFile(`${day} days: ${daysCount[day]}`);
                });

            mongoose.connection.close();
        })
        .on("error", (err) => {
            logToFile(`Error reading CSV: ${err.message}`);
            mongoose.connection.close();
        });
}

main().catch((err) => {
    logToFile(`Fatal error: ${err.message}`);
    mongoose.connection.close();
});
