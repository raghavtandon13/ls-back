import fetch from "node-fetch"; // For future API integration if needed
import mongoose from "mongoose";
import User from "../models/user.model.js"; // Assuming you have a User model
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Connect to MongoDB
mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Define the lender criteria table
const lenderCriteria = {
    SmartCoin: (account) => account.message === "Data Accepted Successfully",
    Mpocket: (account) => account.status === "success" || account.status_code === "1200",
    MoneyView: (account) => account.status === "success",
    Fibe: (account) => account.res?.status === "success",
    Zype: (account) => account.status === "success",
    Cashe: (account) => ["pre-qualified", "pre_quali", "success"].includes(account.status),
    RamFin: (account) => account.status === "success",
};

// Function to filter accepted accounts based on lender criteria
const filterAcceptedAccounts = (accounts) => {
    return accounts
        .filter((account) => {
            const checkCriteria = lenderCriteria[account.lender];
            return checkCriteria ? checkCriteria(account) : false; // Check if criteria function exists
        })
        .map((account) => account.lender); // Return lender names for accepted accounts
};

// Main function to process users one by one
async function processUsers() {
    console.log("Starting to process users...");

    // Fetch users created between 1st and 2nd September 2024
    const users = await User.find({
        createdAt: {
            $gte: new Date("2024-09-01T00:00:00.000Z"),
            $lt: new Date("2024-09-03T00:00:00.000Z"),
        },
    })

    if (users.length === 0) {
        console.log("No users found for the specified date range.");
        mongoose.connection.close();
        return;
    }

    // Process each user one by one
    for (let user of users) {
        console.log(`Processing user with ID: ${user._id}`);

        // Log user details
        console.log(`User phone: ${user.phone}`);
        console.log(`User accounts:`, user.accounts); // Log all accounts

        const acceptedAccounts = filterAcceptedAccounts(user.accounts);

        console.log({
            phone: user.phone,
            acceptedAccounts: acceptedAccounts, // List of accepted lender names
        });

        console.log(`User with ID: ${user._id} processed successfully.`);
    }

    console.log("All users processed.");
    mongoose.connection.close(); // Close the connection when done
}

// Start processing users
processUsers().catch((err) => {
    console.error("Error processing users:", err);
    mongoose.connection.close();
});
