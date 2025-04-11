const fs = require("fs");
const mongoose = require("mongoose");
const ora = require("ora").default;
const { Parser } = require("json2csv");
require("dotenv").config();

const age = [21, 55];
const lender = "Fatak";
const income = 21000;
const FILENAME = "fatak_eligibility";
const FORMAT = "csv"; // json or csv

mongoose.connect(process.env.MONGODB_URI).catch((err) => console.error("MongoDB connection error:", err));

exportAggregation();

async function exportAggregation() {
    const spinner = ora("Exporting aggregation results...").start();

    try {
        // Fetch valid pincodes dynamically
        const validPincodes = await mongoose.connection.collection("Fatak").distinct("pincode", { lender });
        console.log("Valid pincodes:", validPincodes);

        // Define aggregation pipeline after fetching pincodes
        const AGGREGATION_PIPELINE = [
            {
                $match: {
                    employment: "Salaried",
                    pincode: { $in: validPincodes },
                },
            },
            {
                $addFields: {
                    age: {
                        $let: {
                            vars: {
                                dob: {
                                    $dateFromString: { dateString: "$dob", onError: null, onNull: null },
                                },
                            },
                            in: {
                                $cond: [
                                    { $not: "$$dob" },
                                    null,
                                    { $subtract: [{ $year: new Date() }, { $year: "$$dob" }] },
                                ],
                            },
                        },
                    },
                    income: { $convert: { input: "$income", to: "int", onError: null, onNull: null } },
                },
            },
            {
                $match: {
                    age: { $gte: age[0], $lte: age[1] },
                    income: { $gte: income },
                },
            },
            {
                $project: {
                    _id: 0,
                    phone: 1,
                    name: 1,
                    income: 1,
                    dob: 1,
                    pan: 1,
                },
            },
        ];

        // Perform aggregation on users collection
        const results = await mongoose.connection.collection("users").aggregate(AGGREGATION_PIPELINE).toArray();

        const filename = `${FILENAME}.${FORMAT === "csv" ? "csv" : "json"}`;
        if (FORMAT === "csv") {
            const json2csvParser = new Parser();
            const csv = json2csvParser.parse(results);
            fs.writeFileSync(filename, csv);
            spinner.succeed("Export successful! Data saved as CSV.");
        } else {
            fs.writeFileSync(filename, JSON.stringify(results, null, 2));
            spinner.succeed("Export successful! Data saved as JSON.");
        }
    } catch (error) {
        spinner.fail("Error exporting data: " + error.message);
        console.error("Error exporting data:", error);
    } finally {
        mongoose.connection.close();
    }
}
