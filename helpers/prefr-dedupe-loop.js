//  NOTE:
//* THIS LOOP IS FOR PREFR DEDUPE API FOR MONGO DB ENTRIES

const axios = require("axios");
const fs = require("fs");
const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

const CONCURRENCY_LIMIT = 60; // Set the concurrency limit
const TIMEOUT_MS = 1000; // 5 seconds timeout

function logToFile(message) {
    fs.appendFile("prefr-dedupe.txt", message + "\n", (err) => {
        if (err) {
            console.error("Error writing to log file:", err);
        }
    });
}

fs.readFile("CV6L.txt", "utf8", async (err, data) => {
    if (err) {
        console.error("Error reading file:", err);
        return;
    }

    try {
        let phoneNumbers = data.split(/\r?\n/).filter(Boolean);

        const apiUrl1 = "https://credmantra.com/api/v1/partner-api/prefr/dedupe";

        // Function to process a single phone number
        async function processPhone(phone) {
            try {
                const lead = await User.findOne({ phone: phone }).limit(1);

                if (!lead) {
                    const notFoundMessage = `No user found for phone: ${phone}`;
                    console.log(notFoundMessage);
                    logToFile(notFoundMessage);
                    return;
                }

                const obj = {
                    mobileNumber: lead.phone.toString(),
                    panNumber: lead.pan,
                    personalEmailId: lead.email,
                    productName: "pl",
                };

                const response = await axios.post(apiUrl1, obj);

                const successMessage = `Response for Phone ${phone}: ${JSON.stringify(response.data)}`;
                console.log(successMessage);
                logToFile(successMessage);
            } catch (error) {
                const errorMessage = `Error for Phone ${phone}: ${error.message}`;
                console.log(errorMessage);
                logToFile(errorMessage);
            }

            console.log(`-----------------------------------`);
        }

        // Sleep function to delay execution for a specified time
        function sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }

        // Function to process the phones in batches
        async function processInBatches(phones, limit) {
            for (let i = 0; i < phones.length; i += limit) {
                console.log("Started Number: ", i);
                const batch = phones.slice(i, i + limit);
                await Promise.all(batch.map((phone) => processPhone(phone)));
                console.log("Finished Number: ", i);

                // Wait for 5 seconds after processing each batch
                await sleep(TIMEOUT_MS);
            }
        }

        // Process phone numbers with the specified concurrency limit
        await processInBatches(phoneNumbers, CONCURRENCY_LIMIT);
    } catch (error) {
        console.error("Error processing the file:", error);
    }
});
