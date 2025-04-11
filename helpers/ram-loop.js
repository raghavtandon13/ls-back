require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;
const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../models/user.model");
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);
const BATCH_SIZE = 100;
const LEADS_BASE_URL = "https://loansparrow.com";

async function ramInject(lead) {
    const ramUrl = `${LEADS_BASE_URL}/api/v1/partner-api/ram/create`;
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
        const response = await axios.post(ramUrl, ramReq);
        return { new: response.data };
    } catch (error) {
        return { error: error.response?.data?.msg || error.message };
    }
}

async function processBatch(users) {
    const promises = users.map((user) => ramInject(user));
    const results = await Promise.allSettled(promises);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const result = results[i];
        console.log(`PHONE: ${user.phone}`);
        if (result.status === "fulfilled") console.log("Response:", JSON.stringify(result.value, null, 2));
        else console.log("Reason:", result.reason?.message || result.reason);
        console.log("--------------------------------------------");
    }
}

async function loop() {
    try {
        let users;
        do {
            users = await User.aggregate([
                { $match: { "accounts.name": { $ne: "RamFin" } } },
                { $project: { _id: 1, name: 1, phone: 1, email: 1, dob: 1, pan: 1 } },
                { $limit: 1000 },
            ]);
            console.log(users.length);
            for (let i = 0; i < users.length; i += BATCH_SIZE) {
                const batch = users.slice(i, i + BATCH_SIZE);
                await processBatch(batch);
            }
        } while (users.length > 0);
    } catch (error) {
        console.error("General Error:", error);
    } finally {
        mongoose.connection.close();
    }
}

loop();
