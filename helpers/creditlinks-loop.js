const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);
const BATCH_SIZE = 100;
const LEADS_BASE_URL = "http://localhost:3001";
// const LEADS_BASE_URL = "https://credmantra.com";

async function creditlinksInject(lead) {
    // URLS
    const creditlinksDedupeURL = `${LEADS_BASE_URL}/api/v1/partner-api/creditlinks/dedupe`;
    const creditlinksCreateURL = `${LEADS_BASE_URL}/api/v1/partner-api/creditlinks/create`;
    const creditlinksOffersURL = `${LEADS_BASE_URL}/api/v1/partner-api/creditlinks/offers`;

    try {
        // DEDUPE
        const creditlinksDedupePayload = { mobileNumber: lead.phone };
        const dedupeRes = await axios.post(creditlinksDedupeURL, creditlinksDedupePayload);
        if (dedupeRes.data.message !== "Eligible") return dedupeRes.data;

        // CREATE
        const creditlinksCreatePayload = {
            mobileNumber: lead.phone,
            firstName: lead.name.split(" ")[0],
            lastName: lead.name.split(" ")[1],
            pan: lead.pan,
            dob: lead.dob,
            email: lead.email,
            pincode: lead.pincode,
            monthlyIncome: lead.income,
            consumerConsentDate: lead.consent,
            consumerConsentIp: "0.0.0.0",
            employmentStatus: 1,
            employerName: lead.company_name ?? "OTHERS",
            officePincode: lead.pincode,
        };
        const createRes = await axios.post(creditlinksCreateURL, creditlinksCreatePayload);
        if (createRes.data.message !== "Lead created successfully.") return createRes.data;

        // OFFERS
        const creditlinksOffersPayload = {
            mobileNumber: lead.phone,
            leadId: createRes.data.leadId,
        };
        const offersRes = await axios.post(creditlinksOffersURL, creditlinksOffersPayload);
        return offersRes.data;
    } catch (e) {
        return e.response?.data || e.message;
    }
}

async function processBatch(users) {
    const promises = users.map((user) => creditlinksInject(user));
    const results = await Promise.allSettled(promises);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const response = results[i];
        console.log("PHONE:", user.phone);
        if (response.status === "fulfilled") {
            console.log("Value:", response.value);
        } else {
            console.log("Reason:", response.reason);
        }
        console.log("--------------------------------------------");
    }
}

async function loop() {
    try {
        let users;
        do {
            console.log("finding ...");

            users = await User.aggregate([
                {
                    $addFields: {
                        incomeInt: { $convert: { input: "$income", to: "int", onError: null, onNull: null } },
                    },
                },
                {
                    $match: {
                        partner: "MoneyTap",
                        "accounts.name": { $ne: "CreditLinks" },
                        incomeInt: { $gte: 15000 },
                    },
                },
                { $sort: { createdAt: -1 } },
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
