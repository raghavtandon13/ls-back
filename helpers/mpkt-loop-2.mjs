import fetch from "node-fetch";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import dotenv from "dotenv";
dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI;
const BATCH_SIZE = 1;
mongoose.set("strictQuery", false);

async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
}

async function mpkt_status(user) {
    if (!user || !user.accounts) return { error: "User or user accounts not found" };

    const mpktAccountIndex = user.accounts.findIndex((account) => account.name === "Mpocket");
    if (mpktAccountIndex === -1) return { error: "Mpokket account not found" };

    // curl -L 'https://api.mpkt.in/acquisition-affiliate/v1/user?request_id=fa1bd33e-4645-470a-8d2a-4fd62ca3b28a' \
    // -H 'Content-Type: application/json' \
    // -H 'api-key:  3BB5E7A7E44345988BC9111F4C975'

    try {
        const mpktRes = await fetch(
            `https://api.mpkt.in/acquisition-affiliate/v1/user?request_id=${user.accounts[mpktAccountIndex].data.requestId}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "api-key": "3BB5E7A7E44345988BC9111F4C975",
                },
            },
        );

        if (!mpktRes.ok) {
            const errorData = await mpktRes.json();
            console.error(`API error for user ${user.phone}:`, errorData);
            return { error: errorData };
        }

        const mpktStatusData = await mpktRes.json();
        if (!mpktStatusData || mpktStatusData.data === undefined) {
            return { error: "No Data" };
        }
        console.log(mpktStatusData);

        // Flatten the response structure
        const flattenedData = {
            name: "Mpocket",
            data: {
                requestId: user.accounts[mpktAccountIndex].data.requestId,
                acquisition_status: mpktStatusData.data.acquisition_status,
                message: mpktStatusData.data.message,
                user_id: mpktStatusData.data.user_id,
                status_code: mpktStatusData.data.status_code,
                success: mpktStatusData.data.success,
                lastUpdated: new Date(),
            },
        };

        // Update the Mpocket account data
        try {
            user.accounts[mpktAccountIndex] = flattenedData;
            await user.save();
            console.log(`Updated status data for user ${user.phone}`);
        } catch (saveError) {
            console.error(`Error saving status data for user ${user.phone}:`, saveError);
            return { error: "Save error", details: saveError.message };
        }

        return mpktStatusData.data;
    } catch (error) {
        console.error(`Error fetching Mpokket status for user ${user.phone}:`, error);
        return { error: "Fetch error" };
    }
}

async function processUserBatch(users) {
    return Promise.all(
        users.map(async (user) => {
            try {
                console.log(`Processing user ${user.phone}`);
                return await mpkt_status(user);
            } catch (error) {
                console.error(`Error processing user ${user.phone}:`, error);
                return { error: "Processing error" };
            }
        }),
    );
}

async function processUsers() {
    try {
        let continueProcessing = true;
        let processedCount = 0;

        while (continueProcessing) {
            console.log("Processing users");
            const users = await User.find({
                accounts: { $elemMatch: { name: "Mpocket", "data.acquisition_status": { $exists: false } } },
            })
                .sort({ updatedAt: -1 })
                .skip(processedCount)
                .limit(BATCH_SIZE);

            console.log("Found " + users.length + " users");
            if (!users || users.length === 0) {
                console.log("No more users to process");
                continueProcessing = false;
                break;
            }

            await processUserBatch(users);
            processedCount += users.length;
            console.log(`Processed ${processedCount} users so far`);
        }

        console.log(`Finished processing ${processedCount} users`);
    } catch (error) {
        console.error("Error in processUsers:", error);
        throw error;
    }
}

async function main() {
    try {
        await connectDB();
        await processUsers();
    } catch (error) {
        console.error("Fatal error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
        process.exit(0);
    }
}

main();
