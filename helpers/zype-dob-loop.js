const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const User = require("../models/user.model");
require("dotenv").config();

// Function to load users from CSV file
const loadUsers = () => {
    return new Promise((resolve, reject) => {
        const users = [];

        fs.createReadStream("users.csv")
            .pipe(csv())
            .on("data", (row) => {
                // Split the DOB string by '/' and rearrange it to 'YYYY-MM-DD'
                const [month, day, year] = row.dob.split("/");
                const formattedDOB = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
                users.push({ phone: row.phone, dob: formattedDOB });
            })
            .on("end", () => {
                resolve(users);
            })
            .on("error", (err) => {
                reject(new Error("Error reading users.csv: " + err.message));
            });
    });
};

// Function to process users in batches
const processBatch = async (batch) => {
    for (const userInfo of batch) {
        const { phone, dob } = userInfo;

        try {
            const user = await User.findOne({ phone });

            if (user) {
                user.dob = dob;
                await user.save();
                console.log(`Updated user with phone: ${phone}, DOB set to: ${dob}`);
            } else {
                console.log(`User with phone: ${phone} not found`);
            }
        } catch (err) {
            console.error(`Error processing user with phone: ${phone}:`, err.message);
        }
    }
};

async function main() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        mongoose.set("strictQuery", false);
        await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

        const usersToUpdate = await loadUsers();
        const batchSize = 100;

        // Process users in batches of 100
        for (let i = 0; i < usersToUpdate.length; i += batchSize) {
            const batch = usersToUpdate.slice(i, i + batchSize);
            console.log(`Processing batch ${i / batchSize + 1}...`);
            await processBatch(batch);
        }

        console.log("DOB update process complete.");
        process.exit(0); // Exit with success
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1); // Exit with error
    }
}

main();
