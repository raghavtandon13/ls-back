const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const pLimit = require("p-limit");

const host = "https://credmantra.com";
const API_URL = `${host}/api/v1/leads2/inject2`;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ceo:RuxSmFVLnV7Za7Om@cluster0.2vjepfe.mongodb.net/";
const CONCURRENCY_LIMIT = 5;

function logToFile(message) {
    const today = new Date();
    const logFileName = `${today.getDate()}-${today.toLocaleString("default", { month: "short" })}_log.txt`;
    const logFilePath = path.join(__dirname, logFileName);

    fs.appendFile(logFilePath, `${message}\n`, (err) => {
        if (err) console.error("Error writing to log file:", err);
    });
}

async function sendLead(lead) {
    try {
        const leadData = {
            lead: {
                phone: lead.phone,
                firstName: lead.name.split(" ")[0],
                lastName: lead.name.split(" ")[1],
                dob: lead.dob ? lead.dob.split("-").reverse().join("-") : null,
                email: lead.email,
                gender: lead.gender ? lead.gender.toUpperCase() : "MALE",
                city: lead.city,
                state: lead.state ? lead.state.toUpperCase() : "HARYANA",
                pincode: lead.pincode,
                pan: lead.pan,
                empName: lead.company_name,
                salary: lead.income,
                employment: lead.employment === "Self-employed" ? "Self Employed" : lead.employment || "Salaried",
            },
        };

        const response = await axios.post(API_URL, leadData, {
            headers: {
                "x-api-key": "vs65Cu06K1GB2qSdJejP",
                "Content-Type": "application/json",
            },
        });
        console.log(lead.phone);
        console.log(response.data);

        if (response.status === 200) {
            lead.partnerSent = true;
            await lead.save();
            console.log("Lead sent successfully for:", lead.phone);
        } else {
            console.error("Failed to send lead, Status:", response.status);
            logToFile(`Failed to send lead for ${lead.phone}: ${response.statusText}`);
        }
    } catch (error) {
        // console.error("Error sending lead:", error.message);
        logToFile(`Error sending lead for ${lead.phone}: ${error.message}`);
    }
}

async function main() {
    try {
        await mongoose.connect(MONGODB_URI);
        mongoose.set("strictQuery", false);
        console.log("Connected to MongoDB successfully.");

        const limit = pLimit.default(CONCURRENCY_LIMIT);

        while (true) {
            const leads = await User.find({
                "refArr.name": "RamFinNEWshizu",
                isBanned: false,
                partnerSent: false,
            }).limit(50);

            if (!leads.length) {
                console.log("No unsent leads found.");
                break;
            }

            await Promise.all(leads.map((lead) => limit(() => sendLead(lead))));
        }

        await mongoose.disconnect();
        console.log("MongoDB connection closed.");
    } catch (error) {
        console.error("Connection error:", error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

main();
