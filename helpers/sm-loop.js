const axios = require("axios");
const fs = require("fs");
const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

function logToFile(message) {
    fs.appendFile("mpkt-rerun.txt", message + "\n", (err) => {
        if (err) {
            console.error("Error writing to log file:", err);
        }
    });
}

async function punchLeads() {
    console.log("Starting to process leads...");

    const batchSize = 10; // Adjust the batch size as needed

    const cursor = User.find({
        ref: { $ne: "newLoop" },
    })
        .sort({ updatedAt: -1 })
        .cursor();

    let batchCount = 0;

    for (let lead = await cursor.next(); lead != null; lead = await cursor.next()) {
        try {
            console.log(`Processing lead: ${lead.phone}`);
            console.log(lead.createdAt);

            const res = await ramInject(lead);
            console.log(res);
            logToFile(`Response for ${lead.phone}: ${JSON.stringify(res)}`);

            await User.updateOne({ _id: lead._id }, { $set: { ref: "newLoop" } });

            // Increment the batch counter and perform some batch operations if needed
            batchCount++;
            if (batchCount % batchSize === 0) {
                console.log(`Processed ${batchCount} leads...`);
                // Optionally, you can add a small delay to prevent overloading the system
            }
        } catch (error) {
            console.error(`Error processing lead ${lead.phone}:`, error);
            logToFile(`Error processing lead ${lead.phone}: ${error.message}`);
        }
    }

    console.log("Completed processing all leads. Exiting...");
    process.exit(0);
}
async function ramInject(lead) {
    const ramUrl = "http://13.201.23.24/api/v1/partner-api/ram/create";
    const ramUrl2 = "http://13.201.23.24/api/v1/partner-api/ram/status";
    const ramReq = {
        name: lead.name,
        mobile: lead.phone,
        loanAmount: "200000",
        email: lead.email,
        employeeType: "Salaried",
        dob: lead.dob,
        pancard: lead.pan,
    };

    try {
        const ramRes = await axios.post(ramUrl, ramReq);
        if (ramRes.data.status === 1) {
            const ramRes2 = await axios.post(ramUrl2, { mobile: lead.phone });
            return ramRes2.data;
        }
        return ramRes.data;
    } catch (error) {
        const errorMessage = error.response?.data?.msg || error.message;
        console.error(`Error processing lead ${lead.phone}: ${errorMessage}`);
        return { error: errorMessage };
    }
}

punchLeads();
