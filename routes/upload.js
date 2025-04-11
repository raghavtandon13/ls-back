const express = require("express");
const router = express.Router();
const multer = require("multer");
const csvParser = require("csv-parser");
const fs = require("fs");
const mongoose = require("mongoose");

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// Route to upload CSV and add it to a MongoDB collection
router.post("/upload-csv", upload.single("csvFile"), async (req, res) => {
    try {
        const csvFilePath = req.file.path;
        const collectionName = "mis-01"; 
        const collection = mongoose.connection.collection(collectionName);

        // Open the file and start parsing it
        const results = [];

        fs.createReadStream(csvFilePath)
            .pipe(csvParser())
            .on("data", (row) => {
                results.push(row); // Each 'row' is a parsed line from the CSV
            })
            .on("end", async () => {
                try {
                    // Insert the parsed data into the MongoDB collection
                    await collection.insertMany(results);

                    // Send a success response
                    res.status(200).json({ message: "CSV data uploaded and saved to MongoDB." });
                } catch (dbError) {
                    console.error("Error saving to MongoDB:", dbError.message);
                    res.status(500).json({ error: "Error saving data to MongoDB." });
                }
            });
    } catch (error) {
        console.error("Error processing CSV upload:", error.message);
        res.status(500).json({ error: "Failed to upload and process the CSV file." });
    }
});

module.exports = router;
