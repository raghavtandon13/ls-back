const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();

const BATCH_SIZE = 10000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

function calculateAge(dobString) {
    try {
        const dob = new Date(dobString);
        const ageDifMs = Date.now() - dob.getTime();
        const ageDate = new Date(ageDifMs); // Epoch time in ms
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    } catch (error) {
        return null; // Return null if date conversion fails
    }
}

function isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

async function sendToSmartcoin(users) {
    const smDedupeURL = "https://credmantra.com/api/v1/partner-api/smartcoin/smartcoin/dedupe";
    const smCreateURL = "https://credmantra.com/api/v1/partner-api/smartcoin/smartcoin/create";

    for (const user of users) {
        try {
            console.log(`Processing user: ${user.phone}`);
            const smDedupeReq = {
                phone_number: user.phone,
                pan: user.pan,
                employement_type: "SALARIED",
                net_monthly_income: user.income || "30000",
                date_of_birth: user.dob || "",
                name_as_per_PAN: user.name || "",
            };

            const smDedupeRes = await axios.post(smDedupeURL, smDedupeReq);
            console.log("Dedupe Response:", smDedupeRes.data);

            if (smDedupeRes.data.isDuplicateLead === "false") {
                const smOfferReq = {
                    phone_number: user.phone,
                    pan: user.pan,
                    email: user.email,
                    loan_amount: "200000",
                    loan_tenure: "12",
                    employement_type: user.employment || "SALARIED",
                    net_monthly_income: user.income || "30000",
                    date_of_birth: user.dob || "",
                    name_as_per_PAN: user.name || "",
                };

                const smCreateRes = await axios.post(smCreateURL, smOfferReq);
                console.log("Create Offer Response:", smCreateRes.data);
            }
            user.refArr.push({ name: "sm_19mar" });
            await user.save();
        } catch (error) {
            console.error(`Error processing user ${user.phone}:`, error.message);
        }
    }
}

async function processUsers() {
    try {
        let skip = 0;

        while (true) {
            // Pre-filter users to exclude those with invalid DOBs
            console.log("okoko....");
            const allUsers = await User.find({
                accounts: { $elemMatch: { name: "SmartCoin", resp_date: { $lte: new Date("2025-02-18") } } },
                "refArr.name": { $ne: "sm_19mar" },
            })
                .skip(skip)
                .sort({ updatedAt: -1 })
                .limit(BATCH_SIZE);

            console.log(allUsers.length);
            const validUsers = allUsers.filter((user) => isValidDate(user.dob));

            if (validUsers.length === 0) {
                console.log("No more valid users to process.");
                break;
            }

            const usersToProcess = validUsers.filter((user) => {
                const age = calculateAge(user.dob);
                return user.income >= 20000 && age >= 21 && age <= 45;
            });

            if (usersToProcess.length > 0) {
                await sendToSmartcoin(usersToProcess);
            }

            skip += BATCH_SIZE;
        }
    } catch (error) {
        console.error("Error during user processing:", error);
    } finally {
        mongoose.disconnect();
        console.log("Processing complete.");
    }
}

// Run the process
processUsers();
