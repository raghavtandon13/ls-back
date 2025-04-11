const partner = "MoneyTap";
const startDate = new Date("2025-02-21");
let endDate = new Date();
endDate.setDate(endDate.getDate() + 1); // Tomorrow
// endDate = new Date("2025-01-01"); // Change here for endDate

const mongoose = require("mongoose");
const fs = require("fs");
const readline = require("readline");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);

async function connectToDatabase() {
    try {
        await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
}

async function partnerNewDedupeCount() {
    try {
        const counts = await User.aggregate([
            { $match: { partnerHistory: { $elemMatch: { name: partner, date: { $gte: startDate, $lt: endDate } } } } },
            { $unwind: "$partnerHistory" },
            { $match: { "partnerHistory.name": partner, "partnerHistory.date": { $gte: startDate, $lt: endDate } } },
            {
                $group: {
                    _id: "$partnerHistory.type",
                    count: { $sum: 1 },
                },
            },
        ]);
        console.log(counts);

        const total = counts.reduce((acc, curr) => acc + curr.count, 0);
        const newCount = counts.find((c) => c._id === "new")?.count || 0;
        const dedupeCount = counts.find((c) => c._id === "dedupe")?.count || 0;

        console.log({ new: newCount, dedupe: dedupeCount, total });
    } catch (error) {
        console.error("Error :", error);
    } finally {
        try {
            await mongoose.connection.close();
        } catch (closeError) {
            console.error("Error closing Mongoose connection:", closeError);
        }
        process.exit(0);
    }
}

async function getDedupeUsersWithDaysSinceLastSent() {
    try {
        const users = await User.aggregate([
            {
                $match: {
                    partnerHistory: {
                        $elemMatch: { name: partner, date: { $gte: startDate, $lt: endDate }, type: "dedupe" },
                    },
                },
            },
            { $unwind: "$partnerHistory" },
            {
                $match: {
                    "partnerHistory.name": partner,
                    "partnerHistory.date": { $gte: startDate, $lt: endDate },
                    "partnerHistory.type": "dedupe",
                },
            },
            {
                $group: {
                    _id: "$phone",
                    lastSentDate: { $max: "$partnerHistory.date" },
                    createdAt: { $first: "$createdAt" },
                    count: { $sum: 1 },
                },
            },
            {
                $match: { count: 1 },
            },
            {
                $project: {
                    _id: 0,
                    phone: "$_id",
                    daysSinceLastSent: {
                        $round: [{ $divide: [{ $subtract: ["$lastSentDate", "$createdAt"] }, 1000 * 60 * 60 * 24] }, 0],
                    },
                },
            },
        ]);

        console.log(users);
    } catch (error) {
        console.error("Error :", error);
    } finally {
        try {
            await mongoose.connection.close();
            console.log("Mongoose connection closed");
        } catch (closeError) {
            console.error("Error closing Mongoose connection:", closeError);
        }
        process.exit(0);
    }
}

async function checkPhoneNumberExists(phone) {
    try {
        const user = await User.findOne({ phone: phone });
        return user !== null;
    } catch (error) {
        console.error("Error checking phone number:", error);
        return false;
    }
}

async function readPhoneNumbersFromFile(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    const phoneNumbers = [];
    for await (const line of rl) {
        phoneNumbers.push(line.trim());
    }
    return phoneNumbers;
}

async function checkPhoneNumbersFromFile() {
    const filePath = "Book3.txt";
    const phoneNumbers = await readPhoneNumbersFromFile(filePath);

    const concurrencyLimit = 1000;
    let existsCount = 0;
    let notExistsCount = 0;

    const checkPhoneNumber = async (phone) => {
        const exists = await checkPhoneNumberExists(phone);
        if (exists) {
            existsCount++;
        } else {
            notExistsCount++;
        }
        console.log(`Phone number ${phone} exists: ${exists}`);
    };

    const promisePool = [];
    for (const phone of phoneNumbers) {
        const promise = checkPhoneNumber(phone);
        promisePool.push(promise);

        if (promisePool.length >= concurrencyLimit) {
            await Promise.all(promisePool);
            promisePool.length = 0; // Clear the pool
        }
    }

    // Process remaining promises
    if (promisePool.length > 0) {
        await Promise.all(promisePool);
    }

    console.log(`Total phone numbers checked: ${phoneNumbers.length}`);
    console.log(`Phone numbers that exist: ${existsCount}`);
    console.log(`Phone numbers that do not exist: ${notExistsCount}`);
}

async function main() {
    await connectToDatabase();
    // await partnerNewDedupeCount();
    await getDedupeUsersWithDaysSinceLastSent();
    // await checkPhoneNumbersFromFile();
}

main();
