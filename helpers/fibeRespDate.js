const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

const BATCH_SIZE = 1000;

const updateFibeAccounts = async () => {
    try {
        let users = [];
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
            }
        } while (users.length === BATCH_SIZE);

        console.log("All users processed successfully.");
        mongoose.disconnect();
    } catch (err) {
        console.error("Error fetching users:", err);
        mongoose.disconnect();
    }
};

updateFibeAccounts();
