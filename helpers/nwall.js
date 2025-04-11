const fs = require("fs");
const mongoose = require("mongoose");
const ora = require("ora").default;
const User = require("../models/user.model");
const { Transform } = require("stream");
const { Parser } = require("json2csv");
require("dotenv").config();

const FILENAME = "all";
const FORMAT = "csv"; // json or csv
const AGGREGATION_PIPELINE = [
    {
        $project: {
            _id: 0,
            name: 1,
            phone: 1,
            pan: 1,
            aadhar: 1,
            dob: 1,
            email: 1,
            addr: 1,
            city: 1,
            state: 1,
            gender: 1,
            employment: 1,
            company_name: 1,
            income: 1,
            residence_type: 1,
            pincode: 1,
            consent: 1,
        },
    },
];

async function exportAggregation() {
    const spinner = ora("Exporting aggregation results...").start();
    try {
        // Start the aggregation cursor
        const cursor = User.aggregate(AGGREGATION_PIPELINE).cursor({ batchSize: 1000 })

        // Set up file writing stream
        const writeStream = fs.createWriteStream(`${FILENAME}.${FORMAT}`);
        if (FORMAT === "csv") {
            const json2csvParser = new Parser();
            const csvTransform = new Transform({
                objectMode: true,
                transform(doc, _, callback) {
                    try {
                        const csv = json2csvParser.parse([doc]); // Convert each document to CSV
                        callback(null, csv + "\n");
                    } catch (error) {
                        callback(error);
                    }
                },
            });
            cursor.pipe(csvTransform).pipe(writeStream);
        } else {
            writeStream.write("[\n"); // Start JSON array
            const jsonTransform = new Transform({
                objectMode: true,
                transform(doc, _, callback) {
                    callback(null, JSON.stringify(doc) + ",\n");
                },
            });
            cursor
                .pipe(jsonTransform)
                .pipe(writeStream)
                .on("finish", () => {
                    writeStream.write("]\n"); // End JSON array
                });
        }

        writeStream.on("finish", () => {
            spinner.succeed("Export successful!");
        });
        writeStream.on("error", (err) => {
            spinner.fail("Export failed: " + err.message);
        });
    } catch (error) {
        spinner.fail("Error exporting data: " + error.message);
        console.error("Error exporting data:", error);
    } finally {
        mongoose.connection.close();
    }
}

// Connect to MongoDB before starting the export
mongoose
    .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("MongoDB connected successfully.");
        exportAggregation();
    })
    .catch((err) => {
        console.error("Error connecting to MongoDB:", err);
    });
