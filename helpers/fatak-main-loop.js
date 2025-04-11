const axios = require("axios");
const mongoose = require("mongoose");
const fs = require("fs");
const User = require("../models/user.model");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);
const BATCH_SIZE = 1;
const LEADS_BASE_URL = "https://credmantra.com";

async function fatakPayInject(lead) {
    const fatakpayUrl = `${LEADS_BASE_URL}/api/v1/partner-api/fatakpay/eligibility`;

    const fatakpayReq = {
        mobile: parseInt(lead.phone),
        first_name: lead.name.split(" ")[0] || "M",
        last_name: lead.name.split(" ")[1] || "Singh",
        gender: lead.gender,
        email: lead.email,
        employment_type_id: "Salaried",
        pan: lead.pan,
        dob: lead.dob,
        pincode: parseInt(lead.pincode) || 110001,
        consent: true,
        consent_timestamp: lead.consent || new Date().toISOString(),
    };
    console.log(fatakpayReq);

    try {
        const fatakpayRes = await axios.post(fatakpayUrl, fatakpayReq);
        return fatakpayRes.data;
    } catch (error) {
        console.error(`Error processing lead ${lead.phone}:`, error?.response?.status ?? error?.response?.data);
        return null;
    }
}

async function processBatch(users) {
    const promises = users.map((user) => fatakPayInject(user));
    const results = await Promise.all(promises);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const response = results[i];
        // const responseText = `User: ${user.phone} - Response: ${JSON.stringify(response, null, 2)}\n\n`;
        console.log("User:", user.phone);
        console.log(response);
        await User.updateOne({ _id: user._id }, { $push: { refArr: { name: "fatak11feb", date: new Date() } } });
    }
}

async function loop() {
    try {
        const users = await User.aggregate([
            {
                $match: {
                    "refArr.name": { $ne: "fatak11feb" },
                    createdAt: {
                        $gte: new Date("2024-11-01"),
                        $lte: new Date("2025-01-01"),
                    },
                },
            },
            {
                $addFields: {
                    age: {
                        $let: {
                            vars: { dob: { $dateFromString: { dateString: "$dob", onError: null, onNull: null } } },
                            in: {
                                $cond: [
                                    { $not: "$$dob" },
                                    null,
                                    { $subtract: [{ $year: new Date() }, { $year: "$$dob" }] },
                                ],
                            },
                        },
                    },
                    income: { $convert: { input: "$income", to: "int", onError: null, onNull: null } },
                },
            },
            { $match: { age: { $gte: 21, $lte: 50 }, income: { $gte: 20000 } } },
            { $project: { _id: 1, name: 1, gender: 1, phone: 1, email: 1, dob: 1, pan: 1 } },
            { $limit: 1000 },
        ]);

        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const batch = users.slice(i, i + BATCH_SIZE);
            await processBatch(batch);
        }
    } catch (error) {
        console.error("General Error:", error);
    } finally {
        mongoose.connection.close();
    }
}

loop();
