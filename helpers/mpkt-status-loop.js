const axios = require("axios");
const fs = require("fs");
const csv = require("csv-parser");
require("dotenv").config();

const CONCURRENCY_LIMIT = 1;
const API_KEY = "3BB5E7A7E44345988BC9111F4C975";
const outputFilePath = "mpkt_responses.txt";
let records = [];

function logToFile(message) {
    fs.appendFile(outputFilePath, message + "\n", (err) => {
        if (err) {
            console.error("Error writing to log file:", err);
        }
    });
}

async function processRecord(api_request_id, mobile_number) {
    console.log("Processing phone:", mobile_number);
    console.log("AND request_id:", api_request_id);
    const apiUrl = `https://api.mpkt.in/acquisition-affiliate/v1/user?request_id=${api_request_id}`;
    try {
        const response = await axios.get(apiUrl, {
            headers: { "api-key": API_KEY },
        });
        const successMessage = `Response for ${mobile_number}: ${JSON.stringify(response.data)}`;
        console.log(successMessage);
        logToFile(successMessage);
    } catch (error) {
        console.log(error.response.data);
        const errorMessage = `Error for ${mobile_number}: ${error.response.data.message || error.message}`;
        console.error(errorMessage);
        logToFile(errorMessage);
    }
    console.log("-----------------------------------");
}

async function processInBatches(records, limit) {
    for (let i = 0; i < records.length; i += limit) {
        console.log(`Processing batch ${i / limit + 1} of ${Math.ceil(records.length / limit)}`);
        const batch = records.slice(i, i + limit);
        await Promise.all(batch.map((record) => processRecord(record.api_request_id, record.mobile_number)));
        console.log(`Completed batch ${i / limit + 1}`);
    }
}

// Read CSV file
fs.createReadStream("Mpocket2.csv")
    .pipe(
        csv({
            headers: ["mobile_number", "api_request_id"],
            skipLines: 1,
        }),
    )
    .on("data", (row) => {
        records.push({
            api_request_id: row.api_request_id,
            mobile_number: row.mobile_number,
        });
    })
    .on("end", async () => {
        console.log("CSV file successfully processed");
        console.log(`Total records to process: ${records.length}`);
        console.log("First few records:", records.slice(0, 3));

        if (records.length > 0) {
            await processInBatches(records, CONCURRENCY_LIMIT);
            console.log("All batches processed successfully");
        } else {
            console.log("No records found to process");
        }
    })
    .on("error", (err) => {
        console.error("Error reading the CSV file:", err);
    });
