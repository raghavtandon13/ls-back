/**********************************************************************/
const LENDER = "RamFin";
const age = [21, 60];
const income = 20000;
// const limit = 20000;
const FILENAME = "fatak";
const FORMAT = "csv"; // csv or json
/**********************************************************************/

const AGGREGATION_PIPELINE = (validPincodes) => [
    { $match: { employment: "Salaried", pincode: { $in: validPincodes } } },
    {
        $addFields: {
            age: {
                $let: {
                    vars: { dob: { $dateFromString: { dateString: "$dob", onError: null, onNull: null } } },
                    in: {
                        $cond: [{ $not: "$$dob" }, null, { $subtract: [{ $year: new Date() }, { $year: "$$dob" }] }],
                    },
                },
            },
            income: { $convert: { input: "$income", to: "int", onError: null, onNull: null } },
        },
    },
    { $match: { age: { $gte: age[0], $lte: age[1] }, income: { $gte: income } } },
    { $project: { _id: 0, phone: 1, name: 1, income: 1, dob: 1, pan: 1 } },
];

/**********************************************************************/
const fs = require("fs");
const mongoose = require("mongoose");
const ora = require("ora").default;
const User = require("../models/user.model");
const { Parser } = require("json2csv");
require("dotenv").config();
mongoose.connect(process.env.MONGODB_URI).catch((err) => console.error("MongoDB connection error:", err));

async function getValidPincodes() {
    try {
        const siblingDb = mongoose.connection.useDb("Pincode_Master");
        const validPincodes = await siblingDb.collection("Fatak").distinct("pincode");
        return validPincodes;
    } catch (error) {
        console.error("Error fetching valid pincodes:", error);
        throw error;
    }
}

async function exportAggregation() {
    const spinner = ora(`Exporting aggregation results... ${FILENAME}.${FORMAT}`).start();
    try {
        const validPincodes = await getValidPincodes();
        const results = await User.aggregate(AGGREGATION_PIPELINE(validPincodes));
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

exportAggregation();
