const axios = require("axios");
const mongoose = require("mongoose");
const fs = require("fs");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

const BATCH_SIZE = 10; // Number of phone numbers to process in parallel
const startFromLine = 1; // Change this to the line number you want to start from
const INPUT_FILE = "./mv-disbursed.txt"
const OUTPUT_FILE = "mpocket_mv.txt";

const LEADS_BASE_URL = "https://credmantra.com";


async function mpocketInject(lead) {
    const dedupeURL = "http://13.201.83.62/api/v1/mpocket/dedupe";
    const leadURL = "http://13.201.83.62/api/v1/mpocket/lead";
    const statusURL = "http://13.201.83.62/api/v1/mpocket/status";

    const dedupeReq = { mobileNumber: lead.phone, email: lead.email };
    const dedupeRes = await axios.post(dedupeURL, dedupeReq);
    if (dedupeRes.data.message !== "New user") return "Duplicate";

    const leadReq = {
        email_id: lead.email,
        mobile_no: lead.phone,
        full_name: lead.firstName + " " + lead.lastName,
        date_of_birth: lead.dob,
        gender: lead.gender.toLowerCase(),
        profession: "salaried",
    };
    const leadRes = await axios.post(leadURL, leadReq);
    if (leadRes.data.message !== "Data has been accepted") return "Rejected";

    const statusReq = { request_id: leadRes.data.data.request_id };
    const statusRes = await axios.post(statusURL, statusReq);
    return statusRes.data.data; // [0]
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
                        const user = await User.findOne({ phone })
                            .select("name phone email dob")
                            .lean();

                        if (!user) {
                            const notFoundMessage = `User: ${phone} - Not Found\n`;
                            console.warn(notFoundMessage);
                            fs.appendFileSync(OUTPUT_FILE, notFoundMessage, "utf8");
                            return;
                        }

                        // Call ramInject for the user
                        const response = await mpocketInject(user);

                        // Log the response to console and file
                        const responseText = `User: ${user.phone} - Response: ${JSON.stringify(response, null, 2)}\n\n`;
                        console.log(responseText);
                        fs.appendFileSync(OUTPUT_FILE, responseText, "utf8");
                    } catch (error) {
                        const errorMessage = `User: ${phone} - Error: ${error.message}\n\n`;
                        console.error(errorMessage);
                        fs.appendFileSync(OUTPUT_FILE, errorMessage, "utf8");
                    }
                })
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
