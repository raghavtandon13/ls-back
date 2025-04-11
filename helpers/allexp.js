const fs = require("fs");
const mongoose = require("mongoose");
const ora = require("ora").default;
const User = require("../models/user.model");
const { Parser } = require("json2csv");
require("dotenv").config();

// Configuration
const FORMAT = "json"; // Change to "csv" for CSV output

mongoose.connect(process.env.MONGODB_URI).catch((err) => console.error("MongoDB connection error:", err));

async function exportAggregation() {
    const spinner = ora("Initializing export process...").start();

    try {
        // Step 1: Use aggregation to find the earliest and latest createdAt dates
        spinner.text = "Fetching earliest and latest dates...";
        const [dateRange] = await User.aggregate([
            {
                $group: {
                    _id: null,
                    earliestDate: { $min: "$createdAt" },
                    latestDate: { $max: "$createdAt" },
                },
            },
        ]);

        if (!dateRange) {
            spinner.fail("No documents found in the database.");
            return;
        }

        const START_DATE = new Date(dateRange.earliestDate);
        const END_DATE = new Date(dateRange.latestDate);
        END_DATE.setMonth(END_DATE.getMonth() + 1); // Include the last month

        spinner.succeed(`Found data from ${START_DATE.toISOString()} to ${END_DATE.toISOString()}.`);
        spinner.start("Processing monthly data...");

        let currentStartDate = new Date(START_DATE);

        while (currentStartDate < END_DATE) {
            const currentEndDate = new Date(currentStartDate);
            currentEndDate.setMonth(currentEndDate.getMonth() + 1);

            // Step 2: Aggregate data for the current month
            spinner.text = `Processing data from ${currentStartDate.toISOString()} to ${currentEndDate.toISOString()}...`;
            const pipeline = [{ $match: { createdAt: { $gte: currentStartDate, $lt: currentEndDate } } }];
            const results = await User.aggregate(pipeline);

            // Step 3: Write data to a file
            const month = currentStartDate.toISOString().slice(0, 7); // Format as YYYY-MM
            const filename = `export_${month}.${FORMAT === "csv" ? "csv" : "json"}`;

            if (FORMAT === "csv") {
                const json2csvParser = new Parser();
                const csv = json2csvParser.parse(results);
                fs.writeFileSync(filename, csv);
            } else {
                fs.writeFileSync(filename, JSON.stringify(results, null, 2));
            }

            // Notify about successful file creation
            console.log(`✅ Successfully wrote data for ${month}: ${results.length} records.`);
            spinner.succeed(`Finished writing data for ${month} to ${filename}.`);
            spinner.start("Processing next month...");

            // Move to the next month
            currentStartDate = currentEndDate;
        }

        spinner.succeed("Export completed successfully!");
    } catch (error) {
        spinner.fail("Error exporting data: " + error.message);
        console.error("Error exporting data:", error);
    } finally {
        mongoose.connection.close();
        console.log("Database connection closed.");
    }
}

exportAggregation();
