const axios = require("axios");
const mongoose = require("mongoose");
const fs = require("fs");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

const BATCH_SIZE = 10; // Number of phone numbers to process in parallel
const INPUT_FILE = "./ram_all.txt";
const OUTPUT_FILE = "ramfin_all_resp.txt";
const PROGRESS_FILE = "./progress.txt";
const LEADS_BASE_URL = "http://13.201.23.24";

async function ramInject(lead) {
    const ramUrl = `${LEADS_BASE_URL}/api/v1/partner-api/ram/create`;
    const ramUrl2 = `${LEADS_BASE_URL}/api/v1/partner-api/ram/status`;
    const ramReq = {
        name: lead.name,
        mobile: lead.phone,
        loanAmount: "200000",
        email: lead.email,
        employeeType: "Salaried",
        dob: lead.dob,
        pancard: lead.pan,
    };

    try {
        const ramRes = await axios.post(ramUrl, ramReq);
        if (ramRes.data.status === 1) {
            const ramRes2 = await axios.post(ramUrl2, { mobile: lead.phone });
            return ramRes2.data;
        }
        return ramRes.data;
    } catch (error) {
        const errorMessage = error.response?.data?.msg || error.message;
        console.error(`Error processing lead ${lead.phone}: ${errorMessage}`);
        return { error: errorMessage };
    }
}

function getStartLine() {
    if (fs.existsSync(PROGRESS_FILE)) {
        const progress = fs.readFileSync(PROGRESS_FILE, "utf8").trim();
        return parseInt(progress, 10) || 1; // Default to line 1 if progress is invalid
    }
    return 1;
}

function saveProgress(lineNumber) {
    fs.writeFileSync(PROGRESS_FILE, lineNumber.toString(), "utf8");
}

async function loop() {
    try {
        // Read input file
        const fileData = fs.readFileSync(INPUT_FILE, "utf8");
        const phoneNumbers = fileData
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

        // Determine starting line
        const startLine = getStartLine();
        console.log(`Starting from line ${startLine}...`);

        const remainingNumbers = phoneNumbers.slice(startLine - 1); // Adjust for 0-based index

        for (let i = 0; i < remainingNumbers.length; i += BATCH_SIZE) {
            const batch = remainingNumbers.slice(i, i + BATCH_SIZE);

            await Promise.all(
                batch.map(async (phone, index) => {
                    const lineNumber = startLine + i + index; // Calculate current line number

                    try {
                        const user = await User.findOne({ phone }).select("name phone email dob pan").lean();
                        if (!user) {
                            const notFoundMessage = `Line: ${lineNumber} | User: ${phone} - Not Found\n`;
                            console.warn(notFoundMessage);
                            fs.appendFileSync(OUTPUT_FILE, notFoundMessage, "utf8");
                            return;
                        }

                        const response = await ramInject(user);
                        const responseText = `Line: ${lineNumber} | User: ${user.phone} - Response: ${JSON.stringify(response, null, 2)}\n\n`;
                        console.log(responseText);
                        fs.appendFileSync(OUTPUT_FILE, responseText, "utf8");

                        await User.updateOne({ _id: user._id }, { $set: { ref: "40Loop" } });
                    } catch (error) {
                        const errorMessage = `Line: ${lineNumber} | User: ${phone} - Error: ${error.message}\n\n`;
                        console.error(errorMessage);
                        fs.appendFileSync(OUTPUT_FILE, errorMessage, "utf8");
                    }
                }),
            );

            // Save progress after processing the batch
            saveProgress(startLine + i + BATCH_SIZE);
            console.log(`Batch ${Math.ceil((i + 1) / BATCH_SIZE)} completed. Progress saved.`);
        }
    } catch (error) {
        console.error("General Error:", error);
    } finally {
        mongoose.connection.close();
    }
}

loop();
