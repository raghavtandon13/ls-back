const fs = require("fs");
const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

function logToFile(message) {
    fs.appendFile("mpkt-rerun.txt", message + "\n", (err) => {
        if (err) {
            console.error("Error writing to log file:", err);
        }
    });
}

async function punchLeads() {
    const fetch = (await import("node-fetch")).default;

    console.log("Starting to process leads...");

    const batchSize = 1000;
    let totalCount = 0;

    // Initialize cursor for leads
    const cursor = User.find({
        updatedAt: { $gte: new Date("2024-11-01") },
        accounts: { $elemMatch: { name: "MoneyView" } },
        "refArr.name": { $ne: "mvFinalStatus" },
    })
        .sort({ updatedAt: -1 })
        .cursor();

    let batch = [];
    for (let lead = await cursor.next(); lead != null; lead = await cursor.next()) {
        batch.push(lead);

        if (batch.length >= batchSize) {
            await processBatch(batch);
            batch = [];
        }
    }

    // Process any remaining leads
    if (batch.length > 0) {
        await processBatch(batch);
    }

    console.log(`Completed processing all ${totalCount} leads. Exiting...`);
    process.exit(0);
}

async function processBatch(batch) {
    const fetch = (await import("node-fetch")).default;

    const promises = batch.map(async (lead) => {
        try {
            // console.log(`Processing lead: ${lead.phone}`);

            const res = await findMoneyViewId(lead.phone);
            console.log(`Response for ${lead.phone}:`);
            console.log(res);
            logToFile(`Response for ${lead.phone}: ${JSON.stringify(res)}`);
        } catch (error) {
            console.error(`Error processing lead ${lead.phone}:`, error);
            logToFile(`Error processing lead ${lead.phone}: ${error.message}`);
        }
    });

    await Promise.all(promises);
}

async function findMoneyViewId(phone) {
    const fetch = (await import("node-fetch")).default; // Dynamic import for node-fetch

    try {
        const userArray = await User.find({ phone: phone });
        const user = userArray[0];
        if (!user || !user.accounts) {
            return null;
        }

        const moneyViewAccount = user.accounts.find((account) => account.name === "MoneyView");
        if (!moneyViewAccount) {
            return null;
        }

        const tokenResponse = await fetch("https://atlas.whizdm.com/atlas/v1/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                partnerCode: 158,
                userName: "credmantra",
                password: "p-wWj6.13M",
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            throw new Error(`Failed to fetch token: ${tokenResponse.status} ${tokenResponse.statusText}. ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        const token = tokenData.token;

        const leadStatusResponse = await fetch(`https://atlas.whizdm.com/atlas/v1/lead/status/${moneyViewAccount.id}`, {
            method: "GET",
            headers: {
                token: token,
            },
        });

        if (!leadStatusResponse.ok) {
            const errorText = await leadStatusResponse.text();
            throw new Error(
                `Failed to fetch lead status: ${leadStatusResponse.status} ${leadStatusResponse.statusText}. ${errorText}`,
            );
        }

        const leadStatusData = await leadStatusResponse.json();

        const AccountIndex = user.accounts.findIndex((account) => account.name === "MoneyView");
        if (AccountIndex !== -1) {
            const existingAccount = user.accounts[AccountIndex];
            user.accounts[AccountIndex] = {
                ...existingAccount,
                ...leadStatusData,
                update_date: new Date(),
            };
            // console.log("found index", AccountIndex);
        } else {
            user.accounts.push({ ...leadStatusData, update_date: new Date() });
            console.log("pushing...");
        }
        if (!user.refArr) {
            user.refArr = [];
        }
        user.refArr.push({ name: "mvFinalStatus", date: new Date() });
        await user.save();
        return leadStatusData;
    } catch (error) {
        throw error;
    }
}

punchLeads();
