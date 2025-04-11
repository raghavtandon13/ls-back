// ZYPE
const mongoose = require("mongoose");
const User = require("../models/user.model");
const axios = require("axios");
require("dotenv").config();

const API_URL = `https://credmantra.com/api/v1/partner-api`;
const BATCH_SIZE = 10;

mongoose.connect(process.env.MONGODB_URI);

async function processUsers() {
    while (true) {
        const users = await User.find({
            createdAt: {
                $gte: new Date("2024-10-21"),
                $lt: new Date("2024-11-21"),
            },
            "refArr.name": { $ne: "zype1month2" },
        })
            .limit(BATCH_SIZE)
            .select("phone email pan name dob salary empName");

        if (users.length === 0) break;

        const userPromises = users.map(async (user) => {
            try {
                const result = await zypeInject(user);
                console.log("Processed user:", user.phone, result);

                if (!user.refArr) {
                    user.refArr = [];
                }
                user.refArr.push({ name: "zype1month", timestamp: new Date() });
                await user.save();
            } catch (error) {
                console.error("Error processing user:", user.phone, error.message);
            }
        });

        await Promise.all(userPromises);
    }
}

async function zypeInject(lead) {
    const zypeDedupeURL = `${API_URL}/zype/dedupe`;
    const zypeOfferURL = `${API_URL}/zype/offer`;

    const zypeDedupeReq = { mobileNumber: lead.phone, panNumber: lead.pan };
    const zypeDedupeRes = await axios.post(zypeDedupeURL, zypeDedupeReq);

    if (zypeDedupeRes.data.status === "ACCEPT") {
        const zypeOfferReq = {
            mobileNumber: lead.phone,
            email: lead.email,
            panNumber: lead.pan,
            name: lead.name,
            dob: lead.dob,
            employmentType: "salaried",
            income: parseInt(lead.salary) || 30000,
            orgName: lead.empName || "COMPANY",
            bureauType: 3,
        };

        const zypeOfferRes = await axios.post(zypeOfferURL, zypeOfferReq);
        return zypeOfferRes.data;
    }

    return zypeDedupeRes.data;
}

processUsers()
    .then(() => console.log("Processing completed."))
    .catch((error) => console.error("Error during processing:", error));
