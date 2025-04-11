const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");
// const host = "http://localhost:3000";
const host = "https://credmantra.com";

function logToFile(message) {
    const today = new Date();
    const logFileName = `${today.getDate()}-${today.toLocaleString("default", { month: "short" })}_log.txt`;
    const logFilePath = path.join(__dirname, logFileName);

    fs.appendFile(logFilePath, message + "\n", (err) => {
        if (err) console.error("Error writing to log file:", err);
    });
}

const API_URL = `${host}/api/v1/leads/inject2`;
const MONGODB_URI = process.env.MONGODB_URI;

async function processBatch(phonesBatch) {
    try {
        const users = await User.find({ phone: { $in: phonesBatch } })
            .select("phone name dob email gender city state pincode pan company_name income employment")
            .lean();

        if (users.length === 0) {
            console.log("No users found for the current batch.");
            return;
        }

        const leadPromises = users.map(async (user) => {
            try {
                const zypeDedupeURL = `${host}/api/v1/partner-api/zype/dedupe`;
                const zypeOfferURL = `${host}/api/v1/partner-api/zype/offer`;

                const zypeDedupeReq = { mobileNumber: user.phone, panNumber: user.pan };
                const zypeDedupeRes = await axios.post(zypeDedupeURL, zypeDedupeReq);
                console.log(zypeDedupeRes.data);

                if (zypeDedupeRes.data.status === "ACCEPT") {
                    const zypeOfferReq = {
                        mobileNumber: user.phone,
                        email: user.email,
                        panNumber: user.pan,
                        name: user.name,
                        dob: user.dob,
                        employmentType: "salaried",
                        income: parseInt(user.income) || 30000,
                        orgName: user.company_name || "COMPANY",
                        bureauType: 3,
                    };

                    const zypeOfferRes = await axios.post(zypeOfferURL, zypeOfferReq);
                    console.log(zypeOfferRes.data);
                    return zypeOfferRes.data;
                }

                return zypeDedupeRes.data;
            } catch (error) {
                return error.message || error.response.data || "Internal Server Error";
            }
        });

        await Promise.all(leadPromises);
    } catch (error) {
        console.error("Error processing batch:", error);
    }
}

async function main() {
    try {
        mongoose.set("strictQuery", false);
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB successfully.");

        const users = await User.find({ accounts: { $elemMatch: { name: "FatakPay", status: "Eligible" } } })
            .limit(2000)
            .lean();

        const phones = users.map((user) => user.phone);

        if (phones.length === 0) {
            console.log("No phone numbers found in the file.");
            process.exitCode = 1;
            return;
        }

        console.log("Phone numbers to process:", phones);

        const batchSize = 10;
        for (let i = 0; i < phones.length; i += batchSize) {
            const phonesBatch = phones.slice(i, i + batchSize);
            console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(phones.length / batchSize)}`);
            await processBatch(phonesBatch);
        }

        console.log("All leads processed.");
    } catch (error) {
        console.error("Error:", error.message);
        logToFile(`Error: ${error.message}`);
        process.exitCode = 1;
    }
}

main();
