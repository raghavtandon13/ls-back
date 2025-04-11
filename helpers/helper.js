mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

async function findPhonesWithMultipleUsers() {
    try {
        const phones = await User.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date("2025-01-01"),
                        $lt: new Date("2025-01-31"),
                    },
                },
            },
            {
                $group: {
                    _id: "$phone",
                    count: { $sum: 1 },
                    users: { $push: "$$ROOT" },
                },
            },
            {
                $match: {
                    count: { $gt: 1 },
                },
            },
        ]);
        return phones;
    } catch (error) {
        console.error("Error finding phones with multiple users:", error);
    }
}
async function cleanUpUsers(phone) {
    try {
        // Fetch all user documents associated with the phone number
        const users = await User.find({ phone }).sort({ createdAt: -1 });

        if (users.length <= 1) {
            console.log("No duplicates found or only one user document exists for phone:", phone);
            return;
        }

        // Keep the latest document
        const latestUser = users[0];
        // console.log("Latest user before merging:", latestUser);

        // Merge missing keys and accounts from older documents
        for (let i = 1; i < users.length; i++) {
            const user = users[i];
            // console.log("Merging user:", user);

            // Merge missing keys
            for (const key in user.toObject()) {
                if (key !== "_id" && key !== "createdAt" && key !== "updatedAt" && !latestUser[key]) {
                    latestUser[key] = user[key];
                }
            }

            // Merge accounts array
            if (user.accounts && user.accounts.length > 0) {
                latestUser.accounts = latestUser.accounts || [];
                latestUser.accounts = [...new Set([...latestUser.accounts, ...user.accounts])];
            }

            // Log the older document that would be deleted
            // console.log("Would delete user:", user);

            // Delete the older document
            await User.deleteOne({ _id: user._id });
        }

        // Save the updated latest document
        await latestUser.save();

        // Log the final data that is saved in the latest user
        // console.log("Final latest user after merging:", latestUser);

        console.log("Cleanup completed successfully for phone:", phone);
    } catch (error) {
        console.error("Error during cleanup for phone:", phone, error);
    }
}
async function main() {
    try {
        const phones = await findPhonesWithMultipleUsers();

        for (const phoneData of phones) {
            await cleanUpUsers(phoneData._id);
        }

        console.log("All cleanups completed successfully.");
    } catch (error) {
        console.error("Error during main cleanup process:", error);
    } finally {
        mongoose.connection.close();
    }
}
main();
