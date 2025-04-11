const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const host = "https://credmantra.com";
const API_URL = `${host}/api/v1/leads/inject2`;
const MONGODB_URI = process.env.MONGODB_URI;
console.log("MongoDB URI:");
console.log("MongoDB URI:", MONGODB_URI);

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

async function processLead(lead) {
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

        const response = await axios.post(API_URL, leadData, {
            headers: {
                "x-api-key": "vs65Cu06K1GB2qSdJejP",
                lenderstop: "true",
                "Content-Type": "application/json",
            },
        });

        if (response.status === 200) {
            console.log("Response for ", lead.phone, ": ", response.data);
            return {
                success: true,
                id: lead._id,
                ref: "40Loop",
            };
        } else {
            console.error("Failed to send lead:", response.statusText);
        }
    } catch (error) {
        console.error("Error sending lead:", error.message);
    }
    return { success: false, id: lead._id };
}

async function main() {
    try {
        mongoose.set("strictQuery", false);
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB successfully.");

        // Dynamically import p-limit
        const { default: pLimit } = await import("p-limit");

        const limit = pLimit(30);
        let leadFound = true;

        while (leadFound) {
            const leads = await User.find({ refArr: { $ne: "40Loop" } })
                .select("phone name dob email gender city state pincode pan company_name income employment")
                .sort({ createdAt: -1 })
                .limit(30);

            if (leads.length === 0) {
                console.log("No unsent leads found.");
                leadFound = false;
                break;
            }

            console.log("Leads found:", leads.length);

            const results = await Promise.allSettled(leads.map((lead) => limit(() => processLead(lead))));

            const bulkUpdates = results
                .filter((result) => result.status === "fulfilled" && result.value.success)
                .map((result) => ({
                    updateOne: {
                        filter: { _id: result.value.id },
                        update: {
                            $set: { partnerSent: true },
                            $push: { refArr: result.value.ref },
                        },
                    },
                }));

            if (bulkUpdates.length > 0) {
                await User.bulkWrite(bulkUpdates);
                console.log("Updated leads in MongoDB.");
            }
        }
    } catch (error) {
        console.error("Error:", error.message);
        logToFile(`Error: ${error.message}`);
    } finally {
        mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

main();
