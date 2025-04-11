const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

const BATCH_SIZE = 1000;

const countFibeAccounts = async () => {
    try {
        const count = await User.countDocuments({
            accounts: {
                $elemMatch: {
                    name: "Fibe",
                    resp_date: { $exists: false },
                },
            },
        });
        return count;
    } catch (err) {
        console.error("Error counting users:", err);
        return 0;
    }
};

const updateFibeAccounts = async () => {
    try {
        let users = [];
        let totalProcessed = 0;
        const startTime = Date.now();

        do {
            users = await User.find({
                accounts: {
                    $elemMatch: {
                        name: "Fibe",
                        resp_date: { $exists: false },
                    },
                },
            }).limit(BATCH_SIZE);

            if (users.length > 0) {
                const updatePromises = users.map(async (user) => {
                    let updated = false;
                    for (const account of user.accounts) {
                        if (account.name === "Fibe" && account.res && account.res.responseDate) {
                            account.resp_date = new Date(account.res.responseDate);
                            updated = true;
                        }
                    }
                    if (updated) {
                        await User.updateOne(
                            { _id: user._id },
                            { $set: { accounts: user.accounts } },
                            { timestamps: false },
                        );
                        console.log(`Updated phone: ${user.phone}`);
                    }
                });

                await Promise.all(updatePromises);
                totalProcessed += users.length;
            }
        } while (users.length === BATCH_SIZE && false);

        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000; // in seconds
        const avgTimePerBatch = totalTime / (totalProcessed / BATCH_SIZE);
        const remainingBatches = Math.ceil((await countFibeAccounts()) / BATCH_SIZE);
        const estimatedTimeRemaining = remainingBatches * avgTimePerBatch;

        console.log(`All users processed successfully in ${totalTime} seconds.`);
        console.log(`Estimated time remaining for the entire database: ${estimatedTimeRemaining} seconds.`);
        mongoose.disconnect();
    } catch (err) {
        console.error("Error fetching users:", err);
        mongoose.disconnect();
    }
};

const main = async () => {
    const totalDocs = await countFibeAccounts();
    console.log(`Total documents to update: ${totalDocs}`);
    await updateFibeAccounts();
};

main();
