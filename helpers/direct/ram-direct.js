const axios = require("axios");
const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");
const User = require("../../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

const BATCH_SIZE = 1;
const RAMFIN_API_URL = "https://www.ramfincorp.com/loanapply/ramfincorp_api/lead_gen/api/v1/create_lead";
const RAMFIN_API_AUTH =
    "Basic cmFtZmluXzFiMjBiMjJjMDVhYzUyNmMxMjBkOGNjZTRiOTg5MzBhOjBiNzIzMWE3YzA3NDZlZGIyMzMwOWQ0MWM3NTZiMGM1ZDA5OWRlNWY=";

async function ramInject(lead) {
    if (!lead || !lead.name || !lead.phone || !lead.email || !lead.dob || !lead.pan)
        return { status: "not enough details" };
    const ramReq = {
        name: lead.name || "verna",
        mobile: lead.phone,
        loanAmount: "200000",
        email: lead.email,
        employeeType: "Salaried",
        dob: lead.dob,
        pancard: lead.pan,
    };

    try {
        const ramRes = await axios.post(RAMFIN_API_URL, ramReq, { headers: { Authorization: RAMFIN_API_AUTH } });
        return ramRes.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        if (errorMessage === "User already associated with us.") return { message: "Dedupe" };
        if (errorMessage === "Eligibility criteria failed.") return { message: "Ineligible" };
        return { message: errorMessage };
    }
}

async function processBatch(users, collection) {
    const promises = users.map(async (user) => {
        const lead = await User.findOne({ phone: user.phone });
        if (!lead) {
            return { status: "user not found" };
        }
        return await ramInject(lead);
    });
    const results = await Promise.all(promises);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const response = results[i];
        console.log("User:", user.phone);
        console.log(response);
        if (response.status === "user not found") {
            continue;
        }

        const userRecord = await User.findOne({ phone: String(user.phone) });
        if (userRecord) {
            const accountIndex = userRecord.accounts.findIndex((account) => account.name === "RamFin");
            const newAccountData = {
                name: "RamFin",
                status: response.status === "1" ? "success" : "failure",
                msg: response.message,
                resp_date: new Date(),
            };

            if (accountIndex !== -1) {
                userRecord.accounts[accountIndex] = newAccountData;
            } else {
                userRecord.accounts.push(newAccountData);
            }

            userRecord.refArr.push({ name: "ram_7apr", date: new Date() });
            await userRecord.save();
        }

    }
}

async function loop() {
    try {
        let hasMoreLeads = true;
        while (hasMoreLeads) {
            const leads = await User.find({
                account: { $elemMatch: { name: "RamFin", resp_date: { $lte: new Date("2025-02-18") } } },
                "refArr.name": { $ne: "ram_7apr" },
            })
                .limit(1000)
                .toArray();
            if (leads.length === 0) {
                hasMoreLeads = false;
            } else {
                for (let i = 0; i < leads.length; i += BATCH_SIZE) {
                    const batch = leads.slice(i, i + BATCH_SIZE);
                    await processBatch(batch, collection);
                }
                // Add a delay between batches to avoid overwhelming the server
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        console.error("General Error:", error);
    } finally {
        await client.close();
        mongoose.connection.close();
    }
}

loop();
