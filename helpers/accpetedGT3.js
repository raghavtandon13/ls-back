const fs = require("fs");
const readline = require("readline");
const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI);

const inputFilePath = "D:/Code/results.json";
const outputFilePath = "output_phones.csv";

const fileStream = fs.createReadStream(inputFilePath);

const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
});

const phones = [];
const MAX_PHONES = 10000;

rl.on("line", (line) => {
    if (phones.length >= MAX_PHONES) {
        rl.close();
        return;
    }

    try {
        const data = JSON.parse(line);
        if (data.acceptedLenders && data.acceptedLenders.length > 2) {
            phones.push(data.phone);
        }
    } catch (err) {
        console.error(`Error parsing line: ${line}`, err);
    }
});

rl.on("close", () => {
    console.log(`Collected ${phones.length} phone numbers with accepted lenders array length greater than 2.`);

    // Write to CSV
    const csvStream = fs.createWriteStream(outputFilePath);
    csvStream.write("phone\n"); // Write header

    phones.forEach((phone) => {
        csvStream.write(`${phone}\n`);
    });

    csvStream.end(() => {
        console.log(`Phone numbers have been written to ${outputFilePath}`);
    });
});
