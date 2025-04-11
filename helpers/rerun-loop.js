const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();
const axios = require("axios");
const API_URL = `${host}/api/v1/leads/inject2`;
const MONGODB_URI = process.env.MONGODB_URI;

// const host = "http://localhost:3000";
const host = "https://credmantra.com";

// Allocation time for each account in days
const allocationTime = {
    RamFin: 30,
    SmartCoin: 30,
    FatakPay: 30,
    Zype: 30,
    Mpocket: 30,
};

function getAllocationTime(lender) {
    return new Date(new Date().setDate(new Date().getDate() - allocationTime[lender]));
}

async function main() {
    try {
        mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB successfully.");

        let leadFound = true;
        while (leadFound) {
            const leads = await User.aggregate([
                { $unwind: "$accounts" },
                {
                    $addFields: {
                        lenderStatus: {
                            $switch: {
                                branches: [
                                    // RAMFIN CONDITIONS
                                    {
                                        case: {
                                            $and: [
                                                { $eq: ["$accounts.name", "RamFin"] },
                                                { $eq: ["$accounts.msg", "Lead created successfully."] },
                                                { $gte: ["$accounts.resp_date", getAllocationTime("RamFin")] },
                                            ],
                                        },
                                        then: "Accepted",
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $eq: ["$accounts.name", "RamFin"] },
                                                { $eq: ["$accounts.res.message", "Lead created successfully."] },
                                                { $gte: ["$accounts.resp_date", getAllocationTime("RamFin")] },
                                            ],
                                        },
                                        then: "Accepted",
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $eq: ["$accounts.name", "RamFin"] },
                                                { $ne: ["$accounts.lead_status", null] },
                                                { $gte: ["$accounts.resp_date", getAllocationTime("RamFin")] },
                                            ],
                                        },
                                        then: "Accepted",
                                    },
                                    // FATAKPAY CONDITIONS
                                    {
                                        case: {
                                            $and: [
                                                { $eq: ["$accounts.name", "FatakPay"] },
                                                { $eq: ["$accounts.status", "Eligible"] },
                                                { $gte: ["$accounts.resp_date", getAllocationTime("FatakPay")] },
                                            ],
                                        },
                                        then: "Accepted",
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $eq: ["$accounts.name", "FatakPay"] },
                                                { $ne: ["$accounts.stage_name", null] },
                                                { $gte: ["$accounts.resp_date", getAllocationTime("FatakPay")] },
                                            ],
                                        },
                                        then: "Accepted",
                                    },
                                    // SMARTCOIN CONDITIONS
                                    {
                                        case: {
                                            $and: [
                                                { $eq: ["$accounts.name", "SmartCoin"] },
                                                { $eq: ["$accounts.isDuplicateLead", "false"] },
                                                { $gte: ["$accounts.resp_date", getAllocationTime("SmartCoin")] },
                                            ],
                                        },
                                        then: "Accepted",
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $eq: ["$accounts.name", "SmartCoin"] },
                                                { $eq: ["$accounts.message", "Lead created successfully"] },
                                                { $gte: ["$accounts.resp_date", getAllocationTime("SmartCoin")] },
                                            ],
                                        },
                                        then: "Accepted",
                                    },
                                    // ZYPE CONDITIONS
                                    {
                                        case: {
                                            $and: [
                                                { $eq: ["$accounts.name", "Zype"] },
                                                { $eq: ["$accounts.status", "ACCEPT"] },
                                                { $gte: ["$accounts.resp_date", getAllocationTime("Zype")] },
                                            ],
                                        },
                                        then: "Accepted",
                                    },
                                    // MPOCKET CONDITIONS
                                    {
                                        case: {
                                            $and: [
                                                { $eq: ["$accounts.name", "Mpocket"] },
                                                { $eq: ["$accounts.message", "User Eligible for Loan"] },
                                                { $gte: ["$accounts.resp_date", getAllocationTime("Mpocket")] },
                                            ],
                                        },
                                        then: "Accepted",
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $eq: ["$accounts.name", "Mpocket"] },
                                                { $eq: ["$accounts.message", "New User"] },
                                                { $gte: ["$accounts.resp_date", getAllocationTime("Mpocket")] },
                                            ],
                                        },
                                        then: "Accepted",
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $eq: ["$accounts.name", "Mpocket"] },
                                                { $eq: ["$accounts.message", "Data Accepted Successfully"] },
                                                { $gte: ["$accounts.resp_date", getAllocationTime("Mpocket")] },
                                            ],
                                        },
                                        then: "Accepted",
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $eq: ["$accounts.name", "Mpocket"] },
                                                { $eq: ["$accounts.message", "User Not Eligible for Loan"] },
                                                { $gte: ["$accounts.resp_date", getAllocationTime("Mpocket")] },
                                            ],
                                        },
                                        then: "Rejected",
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $eq: ["$accounts.name", "Mpocket"] },
                                                {
                                                    $or: [
                                                        { $eq: ["$accounts.message", null] },
                                                        { $not: ["$accounts.message"] },
                                                    ],
                                                },
                                                { $gte: ["$accounts.resp_date", getAllocationTime("Mpocket")] },
                                            ],
                                        },
                                        then: "Rejected",
                                    },
                                ],
                                default: "Rest",
                            },
                        },
                    },
                },
                { $match: { lenderStatus: "Accepted" } },
                { $sort: { createdAt: -1 } },
                { $limit: 1 },
                {
                    $project: {
                        _id: 1,
                        "accounts.name": 1,
                        phone: 1,
                        name: 1,
                        dob: 1,
                        email: 1,
                        gender: 1,
                        city: 1,
                        state: 1,
                        pincode: 1,
                        pan: 1,
                        company_name: 1,
                        income: 1,
                        employment: 1,
                    },
                },
            ]);

            console.log(leads);

            if (leads.length === 0) {
                console.log("No unsent leads found.");
                leadFound = false;
                process.exit(1);
            } else {
                console.log("Leads found.");
            }

            const leadPromises = leads.map(async (lead) => {
                try {
                    console.log("Sending lead:", lead.phone);
                    const leadData = {
                        lead: {
                            phone: lead.phone,
                            firstName: lead.name.split(" ")[0],
                            lastName: lead.name.split(" ")[1],
                            dob: lead.dob,
                            email: lead.email,
                            gender: lead.gender ? lead.gender.toUpperCase() : "MALE",
                            city: lead.city || "city",
                            state: lead.state ? lead.state.toUpperCase() : "HARYANA",
                            pincode: lead.pincode,
                            pan: lead.pan,
                            empName: lead.company_name || "COMPANY",
                            salary: lead.income,
                            employment: !lead.employment
                                ? "Salaried"
                                : lead.employment === "Self-employed"
                                  ? "Self Employed"
                                  : lead.employment,
                        },
                    };

                    console.log(leadData);

                    const response = await axios.post(API_URL, leadData, {
                        headers: {
                            "x-api-key": "vs65Cu06K1GB2qSdJejP",
                            "Content-Type": "application/json",
                        },
                    });

                    if (response.status === 200) {
                        lead.partnerSent = true;
                        lead.ref = "zeroAcc";
                        await lead.save();
                        console.log("Response for ", lead.phone, ": ", response.data);
                    } else {
                        console.error("Failed to send lead:", response.statusText);
                    }
                } catch (error) {
                    console.error("Error sending lead:", error);
                }
            });

            await Promise.all(leadPromises);
            leadFound = true;
        }
    } catch (error) {
        console.error("Error:", error.message);
        logToFile(`Error: ${error.message}`);
        process.exit(1);
    }
}

main();
