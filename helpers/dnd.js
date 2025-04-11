const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();

// Define a list of numbers
const numbers = [
    "9902055776",
    "7357133575",
    "9833499159",
    "9662782785",
    "7415504409",
    "9981971060",
    "9627599257",
    "8008157443",
    "9740238840",
    "9987740343",
    "8008242615",
    "9449060411",
    "7016522568",
    "9809240025",
    "7020728659",
    "9851224726",
];

async function main() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        mongoose.set("strictQuery", false);
        mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

        for (const number of numbers) {
            const users = await User.find({ phone: number });
            const user = await User.findOne({ phone: number });
            if (user) {
                user.isBanned = true;
                await user.save();
                console.log(number, " : ", users.length, " : ", "found");
                continue;
            } else {
                await User.create({ phone: number, isBanned: true });
                console.log(number, " : ", users.length, " : ", "new");
            }
        }
        console.log("TOTAL: ", numbers.length);
        console.log("DND DONE");

        // You can add further logic here if needed

        process.exit(0); // Exit with success
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1); // Exit with error
    }
}

main();
