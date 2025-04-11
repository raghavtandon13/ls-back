const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

async function addDOB() {
    const results = [];

    fs.createReadStream("./new_zype_dob.csv")
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", async () => {
            const bulkOps = results.map((entry) => {
                const { phone, DOB } = entry;

                const [day, month, year] = DOB.split("/");
                const dob = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

                return {
                    updateOne: {
                        filter: { phone },
                        update: { dob },
                        upsert: false, // Set to true if you want to create a new document if no match is found
                    },
                };
            });

            try {
                const result = await User.bulkWrite(bulkOps);
                console.log(
                    `Bulk update completed. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`,
                );
            } catch (error) {
                console.error("Error during bulk update:", error);
            } finally {
                mongoose.connection.close();
            }
        });
}

addDOB();
