const mongoose = require("mongoose");
const fs = require("fs");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);
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
        return { error: "Error in smartcoin_status" };
    }
}

async function processRamfinStatus() {
    try {
        const BATCH_SIZE = 10;
        const startFromIndex = 0;

        const users = await User.find({
            accounts: { $elemMatch: { name: "RamFin", msg: "Lead created successfully." } },
            createdAt: { $gte: new Date("2024-12-01") },
            partner: "Zype_LS",
        })
            .select("phone")
            .lean();

        console.log(`Found ${users.length} users with RamfinPay accounts.`);

        for (let i = startFromIndex; i < users.length; i += BATCH_SIZE) {
            const batch = users.slice(i, i + BATCH_SIZE);

            await Promise.all(
                batch.map(async (user) => {
                    try {
                        const response = await ramfin_status(user.phone);

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

processRamfinStatus();
