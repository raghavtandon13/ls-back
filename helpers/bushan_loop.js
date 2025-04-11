const mongoose = require("mongoose");
const fs = require("fs");
const axios = require("axios");
const User = require("../models/user.model");
require("dotenv").config();
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI);

const BATCH_SIZE = 1; // Number of phone numbers to process in parallel
const startFromLine = 1; // Change this to the line number you want to start from

async function loop() {
    try {
        // Read phone numbers from a file
        const fileData = fs.readFileSync("./zype_bushan.txt", "utf8");
        const phoneNumbers = fileData
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(startFromLine - 1); // Start processing from the specified line

        console.log(`Processing ${phoneNumbers.length} phone numbers starting from line ${startFromLine}...`);

        for (let i = 0; i < phoneNumbers.length; i += BATCH_SIZE) {
            const batch = phoneNumbers.slice(i, i + BATCH_SIZE);
            await Promise.all(
                batch.map(async (phone) => {
                    try {
                        // Fetch the user based on the phone number
                        const user = await User.findOne({ phone })
                            .select("pan phone name gender dob email city state pincode income consent")
                            .lean();

                        if (!user) {
                            const notFoundMessage = `User: ${phone} - Not Found\n`;
                            console.warn(notFoundMessage);
                            fs.appendFileSync("zype_dec_response.txt", notFoundMessage, "utf8");
                            return;
                        }

                        const dobFormatted = new Date(user.dob).toLocaleDateString("en-IN").split("/").reverse().join("/");
                        const lead = [
                            {
                                pan_card: user.pan,
                                mobile_number: user.phone,
                                full_name: user.name,
                                gender: user.gender.toUpperCase(),
                                dob: dobFormatted,
                                email: user.email,
                                city: user.city,
                                state: user.state,
                                address: `${user.city}, ${user.state}`,
                                pincode: user.pincode,
                                employment_type: "Salaried",
                                monthly_income: user.income,
                                loan_requirement: "250000",
                                vendor_id: "3",
                                consent_datetime: user.consent || "",
                            },
                        ];

                        // Send data to the API
                        const response = await axios.post("https://zeruasys.com/cashkuber/api/Customers", lead, {
                            headers: { "Content-Type": "application/json" },
                        });

                        // Log the response
                        const responseText = `User: ${user.phone} - Response: ${JSON.stringify(response.data, null, 2)}\n\n`;
                        console.log(responseText); // Print to console
                        fs.appendFileSync("zype_dec_response.txt", responseText, "utf8"); // Append to file
                    } catch (error) {
                        const errorMessage = `User: ${phone} - Error: ${error.message}\n\n`;
                        console.error(errorMessage); // Print error to console
                        fs.appendFileSync("zype_dec_response.txt", errorMessage, "utf8"); // Append error to file
                    }
                })
            );

            console.log(`Batch ${Math.ceil((i + 1) / BATCH_SIZE)} completed.`);
        }
    } catch (error) {
        console.error("General Error:", error);
    } finally {
        mongoose.connection.close();
    }
}

loop();
