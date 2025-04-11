const axios = require("axios");
const mongoose = require("mongoose");
const fs = require('fs').promises;
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
const LEADS_BASE_URL = "http://localhost:3000";
const BATCH_SIZE = 10;
// Set the batch number you want to start from (e.g., 117 for batch 117)
const START_FROM_BATCH = 118;

mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

async function fatakpayInject(lead) {
    const fatakpayUrl = `${LEADS_BASE_URL}/api/v1/partner-api/fatakpay/eligibility`;
    
    const fatakpayReq = {
        mobile: parseInt(lead.phone),
        first_name: lead.name.split(" ")[0] || lead.name,
        last_name: lead.name.split(" ")[1] || " ",
        email: lead.email,
        employment_type_id: "Salaried",
        pan: lead.pan,
        dob: lead.dob,
        pincode: parseInt(lead.pincode) || 110001,
        consent: true,
        consent_timestamp: lead.consent,
    };

    try {
        const fatakpayRes = await axios.post(fatakpayUrl, fatakpayReq);
        return fatakpayRes.data;
    } catch (error) {
        console.error(`Error processing lead ${lead.phone}:`, error);
        return null;
    }
}

async function readPhoneNumbers() {
    try {
        const fileContent = await fs.readFile('fatak.txt', 'utf8');
        return fileContent.split('\n')
            .map(line => line.trim())
            .filter(line => line.length === 10);
    } catch (error) {
        console.error('Error reading file:', error);
        return [];
    }
}

async function processPhoneNumbersInBatches() {
    try {
        const phoneNumbers = await readPhoneNumbers();
        console.log(`Total valid phone numbers found: ${phoneNumbers.length}`);

        // Calculate starting index based on batch number
        const startIndex = START_FROM_BATCH * BATCH_SIZE;
        console.log(`Starting from batch ${START_FROM_BATCH} (index ${startIndex})`);

        // Process in batches starting from the specified batch
        for (let i = startIndex; i < phoneNumbers.length; i += BATCH_SIZE) {
            const batch = phoneNumbers.slice(i, i + BATCH_SIZE);
            const currentBatch = Math.floor(i/BATCH_SIZE) + 1;
            console.log(`Processing batch ${currentBatch} (${batch.length} numbers)`);

            const users = await User.find({
                phone: { $in: batch.map(phone => phone.toString()) },
                partner: "Zype_LS",
                "accounts.name": { $ne: "FatakPay" }
            });

            console.log(`Found ${users.length} matching users in database for batch ${currentBatch}`);

            const promises = users.map(async (user) => {
                console.log(`Processing user with phone: ${user.phone}`);
                const result = await fatakpayInject(user);
                
                if (result) {
                    console.log(`Successfully processed user ${user.phone}:`, result);
                } else {
                    console.log(`Failed to process user ${user.phone}`);
                }
            });

            await Promise.all(promises);
            console.log(`Completed batch ${currentBatch}`);

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log("All remaining phone numbers processed.");
    } catch (error) {
        console.error("Error in processing:", error);
    } finally {
        mongoose.connection.close();
    }
}

// Start processing
processPhoneNumbersInBatches();
