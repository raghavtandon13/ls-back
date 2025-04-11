const axios = require("axios");
const mongoose = require("mongoose");
const fs = require("fs");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

const BATCH_SIZE = 25;
const startFromLine = 1;
const INPUT_FILE = "./smartcoin.txt";
const OUTPUT_FILE = "sm-4dec.txt";

const LEADS_BASE_URL = "https://credmantra.com";

async function sendToSmartcoin(user) {
    const smDedupeURL = "https://credmantra.com/api/v1/partner-api/smartcoin/smartcoin/dedupe";
    const smCreateURL = "https://credmantra.com/api/v1/partner-api/smartcoin/smartcoin/create";

    console.log(`Processing user: ${user.phone}, AIP: ${user.dob} ${user.income} ${user.pincode}`);
    const smDedupeReq = {
        phone_number: user.phone,
        pan: user.pan,
    };

    const smDedupeRes = await axios.post(smDedupeURL, smDedupeReq);

    if (smDedupeRes.data.isDuplicateLead === "false") {
        const smOfferReq = {
            phone_number: user.phone,
            pan: user.pan,
            email: user.email,
            loan_amount: "200000",
            loan_tenure: "12",
            employement_type: "SALARIED",
            net_monthly_income: user.income || "30000",
            date_of_birth: user.dob || "",
        };

        const smCreateRes = await axios.post(smCreateURL, smOfferReq);
        console.log("Create Offer Response:", smCreateRes.data);
    } else {
        console.log("Dedupe Response:", smDedupeRes.data);
    }
}

async function loop() {
    try {
        // Read phone numbers from the input file
        const fileData = fs.readFileSync(INPUT_FILE, "utf8");
        const phoneNumbers = fileData
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(startFromLine - 1); // Start processing from the specified line

        console.log(`Processing ${phoneNumbers.length} phone numbers starting from line ${startFromLine}...`);

        for (let i = 0; i < phoneNumbers.length; i += BATCH_SIZE) {
            const batch = phoneNumbers.slice(i, i + BATCH_SIZE);

            await Promise.all(
                batch.map(async (phone) => {
                    try {
                        // Fetch user from MongoDB with only required fields
                        const user = await User.findOne({ phone }).lean();

                        if (!user) {
                            const notFoundMessage = `User: ${phone} - Not Found\n`;
                            console.warn(notFoundMessage);
                            fs.appendFileSync(OUTPUT_FILE, notFoundMessage, "utf8");
                            return;
                        }

                        // Call ramInject for the user
                        const response = await sendToSmartcoin(user);
                    } catch (error) {
                        const errorMessage = `User: ${phone} - Error: ${error.message}\n\n`;
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

loop();
