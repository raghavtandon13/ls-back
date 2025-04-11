
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
        if (err) {
            console.error("Error writing to log file:", err);
        }
    });
}

const API_URL = `${host}/api/v1/leads/inject2`;
const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
    try {
        mongoose.set("strictQuery", false);
        mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB successfully.");

        let leadFound = true;
        while (leadFound) {
            const leads = await User.find({
                partner: "MoneyTap",
                createdAt: { $gte: new Date("2024-12-01") },
                $expr: { $eq: [{ $size: { $ifNull: ["$accounts", []] } }, 0] },
            })
                .select("phone name dob email gender city state pincode pan company_name income employment")
                .sort({ createdAt: -1 })
                .limit(30);

            console.log(leads);

            if (leads.length === 0) {
                console.log("No unsent leads found.");
                leadFound = false;
                process.exit(1);
            } else {
                console.log("Leads found.");
            }

            const leadPromises = leads.map(async (lead) => {
                try {
                    console.log("Sending lead:", lead.phone);
                    const leadData = {
                        lead: {
                            phone: lead.phone,
                            firstName: lead.name.split(" ")[0],
                            lastName: lead.name.split(" ")[1],
                            dob: lead.dob,
                            email: lead.email,
                            gender: lead.gender ? lead.gender.toUpperCase() : "MALE",
                            city: lead.city || "city",
                            state: lead.state ? lead.state.toUpperCase() : "HARYANA",
                            pincode: lead.pincode,
                            pan: lead.pan,
                            empName: lead.company_name || "COMPANY",
                            salary: lead.income,
                            employment: !lead.employment
                                ? "Salaried"
                                : lead.employment === "Self-employed"
                                  ? "Self Employed"
                                  : lead.employment,
                        },
                    };

                    console.log(leadData);

                    const response = await axios.post(API_URL, leadData, {
                        headers: {
                            "x-api-key": "vs65Cu06K1GB2qSdJejP",
                            "Content-Type": "application/json",
                        },
                    });

                    if (response.status === 200) {
                        lead.partnerSent = true;
                        lead.ref = "zeroAcc";
                        await lead.save();
                        console.log("Response for ", lead.phone, ": ", response.data);
                    } else {
                        console.error("Failed to send lead:", response.statusText);
                    }
                } catch (error) {
                    console.error("Error sending lead:", error);
                }
            });

            await Promise.all(leadPromises);
            leadFound = true;
        }
    } catch (error) {
        console.error("Error:", error.message);
        logToFile(`Error: ${error.message}`);
        process.exit(1);
    }
}

main();
