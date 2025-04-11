const axios = require("axios");
const fs = require("fs");
const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

const CONCURRENCY_LIMIT = 60; // Set the concurrency limit
let processedPhones = 0; // Track the number of processed phones
let stopProcessing = false; // Flag to stop processing after 5 seconds

function logToFile(message) {
    fs.appendFile("prefr-dedupe.txt", message + "\n", (err) => {
        if (err) {
            console.error("Error writing to log file:", err);
        }
    });
}

fs.readFile("./prefr.txt", "utf8", async (err, data) => {
    if (err) {
        console.error("Error reading file:", err);
        return;
    }

    try {
        let phoneNumbers = data.split(/\r?\n/).filter(Boolean);

        const apiUrl1 = "https://credmantra.com/api/v1/partner-api/prefr/dedupe";

        // Function to process a single phone number
        async function processPhone(phone) {
            if (stopProcessing) return; // Stop processing if the time limit is reached

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

            processedPhones++; // Increment the count of processed phones
            console.log(`-----------------------------------`);
        }

        // Function to process the phones in batches
        async function processInBatches(phones, limit) {
            for (let i = 0; i < phones.length; i += limit) {
                if (stopProcessing) break; // Stop processing if the time limit is reached
                const batch = phones.slice(i, i + limit);
                await Promise.all(batch.map((phone) => processPhone(phone)));
            }
        }

        // Start timing the algorithm
        console.log("Processing started...");
        const startTime = Date.now();

        // Stop processing after 5 seconds (5000 milliseconds)
        setTimeout(() => {
            stopProcessing = true; // Flag to stop further processing
            const timeElapsed = (Date.now() - startTime) / 1000; // Time in seconds
            console.log(`Processed ${processedPhones} phones in ${timeElapsed} seconds.`);
        }, 5000); // 5 seconds in milliseconds

        // Process phone numbers with the specified concurrency limit
        await processInBatches(phoneNumbers, CONCURRENCY_LIMIT);

        // Ensure that when all is done, we print the number of processed phones if stopped early
        const finalTimeElapsed = (Date.now() - startTime) / 1000;
        console.log(`Final: Processed ${processedPhones} phones in ${finalTimeElapsed} seconds.`);
    } catch (error) {
        console.error("Error processing the file:", error);
    }
});
