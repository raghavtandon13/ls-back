// LOANTAP
const mongoose = require("mongoose");
const User = require("../models/user.model");
const axios = require("axios");
require("dotenv").config();

const API_URL = `https://credmantra.com/api/v1/partner-api`;
const BATCH_SIZE = 10;
const CONCURRENT_PROCESSING = false;

mongoose.connect(process.env.MONGODB_URI);

async function processMoneyTapUsers() {
    while (true) {
        const users = await User.find({
            createdAt: { $gte: new Date("2025-03-01") },
            partner: "MoneyTap",
            "accounts.name": { $ne: "LoanTap" },
        }).limit(BATCH_SIZE);

        if (users.length === 0) break;

        if (CONCURRENT_PROCESSING) {
            const userPromises = users.map(async (user) => {
                console.log("Processing user:", user.phone);
                try {
                    const result = await loantapInject(user);

                    if (!user.refArr) {
                        user.refArr = [];
                    }
                    user.refArr.push({ name: "loantapNEW" });
                    await user.save();
                    console.dir({ phone: user.phone, result }, { depth: null });
                } catch (error) {
                    console.error("Error processing user:", user.phone, error);
                }
            });

            await Promise.all(userPromises);
        } else {
            for (const user of users) {
                console.log("Processing user:", user.phone);
                try {
                    const result = await loantapInject(user);
                    console.dir({ phone: user.phone, result }, { depth: null });
                } catch (error) {
                    console.error("Error processing user:", user.phone, error.message);
                }
            }
        }
    }
}

async function loantapInject(user) {
    const loantapURL = `${API_URL}/loantap/`;

    const loantapReq = {
        add_application: {
            full_name: user.name,
            personal_email: user.email,
            mobile_number: user.phone,
            job_type: "salaried",
            pan_card: user.pan,
            dob: user.dob,
            home_zipcode: user.pincode,
            fixed_income: user.salary || "30000",
            loan_city: user.city || "Bangalore",
            consent_given: "yes",
            consent_given_timestamp: user.consent,
        },
    };
    // console.log(JSON.stringify(loantapReq));

    const response = await axios.post(loantapURL, loantapReq, {
        headers: { "Content-Type": "application/json" },
    });

    return response.data;
}

processMoneyTapUsers()
    .then(() => console.log("Processing completed for MoneyTap."))
    .catch((error) => console.error("Error during MoneyTap processing:", error));
