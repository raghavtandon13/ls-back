const axios = require("axios");
const mongoose = require("mongoose");
const fs = require("fs");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);
const LEADS_BASE_URL = "http://localhost:3000";
const OUTPUT_FILE = "fatak-status-output.txt";

const FatakPayStatus = async (lead) => {
    const fatakpayUrl = `${LEADS_BASE_URL}/api/v1/partner-api/fatakpay/status`;

    const fatakpayReq = {
        mobile: lead.phone,
        loan_id: lead.loan_id,
    };

    try {
        const fatakpayRes = await axios.post(fatakpayUrl, fatakpayReq);
        return fatakpayRes.data;
    } catch (error) {
        console.error(`Error processing lead ${lead.phone}:`, error);
        return null;
    }
};

async function processFatakPayStatus() {
    try {
        const BATCH_SIZE = 10;
        const startFromIndex = 0; // Change if you want to skip initial users

        // Fetch all users with FatakPay accounts
        const users = await User.find({ accounts: { $elemMatch: { name: "FatakPay", status: "Eligible" } } })
            .select("phone accounts.name accounts.loan_id")
            .lean();

        console.log(`Found ${users.length} users with FatakPay accounts.`);

        for (let i = startFromIndex; i < users.length; i += BATCH_SIZE) {
            const batch = users.slice(i, i + BATCH_SIZE);

            await Promise.all(
                batch.map(async (user) => {
                    try {
                        // Extract the FatakPay account
                        const fatakPayAccount = user.accounts.find((account) => account.name === "FatakPay");

                        if (!fatakPayAccount || !fatakPayAccount.loan_id) {
                            const notFoundMessage = `User: ${user.phone} - FatakPay account or loan_id not found\n`;
                            console.warn(notFoundMessage);
                            fs.appendFileSync(OUTPUT_FILE, notFoundMessage, "utf8");
                            return;
                        }

                        // Prepare the payload for FatakPayStatus
                        const payload = {
                            phone: user.phone,
                            loan_id: fatakPayAccount.loan_id,
                        };

                        // Send the request
                        const response = await FatakPayStatus(payload);

                        // Log response
                        const responseText = `User: ${user.phone} - Response: ${JSON.stringify(response, null, 2)}\n\n`;
                        console.log(responseText);
                        fs.appendFileSync(OUTPUT_FILE, responseText, "utf8");
                    } catch (error) {
                        const errorMessage = `User: ${user.phone} - Error: ${error.message}\n\n`;
                        console.error(errorMessage);
                        fs.appendFileSync(OUTPUT_FILE, errorMessage, "utf8");
                    }
                }),
            );

            console.log(`Batch ${Math.ceil((i + 1) / BATCH_SIZE)} completed.`);
        }
    } catch (error) {
        console.error("General Error:", error);
    } finally {
        mongoose.connection.close();
    }
}

processFatakPayStatus();
