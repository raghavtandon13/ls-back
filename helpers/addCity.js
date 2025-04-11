const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

async function addCity() {
    const results = [];
    fs.createReadStream("./city.csv")
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", async () => {
            for (const entry of results) {
                const { phone, city } = entry;

                try {
                    const user = await User.findOne({ phone });
                    if (user) {
                        user.city = city === "#N/A" ? null : city;
                        await user.save();
                        console.log(`Updated city for phone: ${phone} with ${city}`);
                    } else {
                        console.log(`User with phone ${phone} not found.`);
                    }
                } catch (error) {
                    console.error(`Error updating user with phone ${phone}:`, error);
                }
            }
            console.log("City update process completed.");
            mongoose.connection.close();
        });
}

addCity();
