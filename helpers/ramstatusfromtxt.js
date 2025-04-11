const mongoose = require("mongoose");
const fs = require("fs");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

const INPUT_FILE = "mobile.txt";
const PROGRESS_FILE = "ramfin-progress.txt";
const OUTPUT_FILE = "ramfin-status-output.txt";

async function ramfin_status(phone) {
    try {
        const scResponse = await fetch("https://credmantra.com/api/v1/partner-api/ram/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mobile: phone }),
        });
        if (!scResponse.ok) {
            const errorData = await scResponse.json();
            return { error: errorData.msg };
        }
        const scStatusData = await scResponse.json();
        return scStatusData;
    } catch (error) {
        const errorMessage = error?.response?.data?.message || "An unexpected error occurred";
        return { msg: errorMessage };
    }
}

function getStartIndex() {
    if (fs.existsSync(PROGRESS_FILE)) {
        const progressData = fs.readFileSync(PROGRESS_FILE, "utf8");
        return parseInt(progressData.trim(), 10) || 0;
    }
    return 0;
}

function saveProgress(index) {
    fs.writeFileSync(PROGRESS_FILE, index.toString(), "utf8");
}

async function processRamfinStatus() {
    try {
        const phones = fs
            .readFileSync(INPUT_FILE, "utf8")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
        const startFromIndex = getStartIndex();

        console.log(`Found ${phones.length} phone numbers in file.`);
        console.log(`Resuming from line ${startFromIndex + 1}.`);

        for (let i = startFromIndex; i < phones.length; i++) {
            const phone = phones[i];

            try {
                const response = await ramfin_status(phone);

                const responseText = `Phone: ${phone} - Response: ${JSON.stringify(response, null, 2)}\n\n`;
                console.log(responseText);
                fs.appendFileSync(OUTPUT_FILE, responseText, "utf8");

                await User.updateOne({ phone: phone }, { $push: { refArr: { name: "ramstatus", date: new Date() } } });

                saveProgress(i + 1);
            } catch (error) {
                const errorMessage = `Phone: ${phone} - Error: ${error.message}\n\n`;
                console.error(errorMessage);
                fs.appendFileSync(OUTPUT_FILE, errorMessage, "utf8");
            }
        }

        console.log("Processing completed.");
    } catch (error) {
        console.error("General Error:", error);
    } finally {
        mongoose.connection.close();
    }
}

processRamfinStatus();
