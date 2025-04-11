const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

const BATCH_SIZE = 1;
const dedupeAPI = "https://lms.lendingplate.co.in/api/Api/affiliateApi/checkmobile";
const punchAPI = "https://lms.lendingplate.co.in/api/Api/affiliateApi/loanprocess";
const partner_id = "CREDMANTRA";

function generateRefId() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

async function lendingPlateInject(lead) {
    let response = {};
    const ref_id = generateRefId();

    try {
        const lendingPlateDedupeReq = { mobile: String(lead.phone), partner_id: partner_id, ref_id: ref_id };
        const lendingPlateDedupeRes = await axios.post(dedupeAPI, lendingPlateDedupeReq, {
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer 1c0fb89cb720d1f59dffcee1fa4bdca768a81230754bbcf743511160da4dbd77",
            },
        });
        response.dedupe = lendingPlateDedupeRes?.data?.message;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        response.dedupe = errorMessage;
    }
    if (response.dedupe === "Success") {
        try {
            const lendingPlateOfferReq = {
                partner_id: "CREDMANTRA",
                ref_id: ref_id,
                mobile: lead.phone,
                customer_name: lead.name,
                pancard: lead.pan,
                dob: new Date(lead.dob).toLocaleDateString("en-GB").split("/").join("/"),
                pincode: lead.pincode,
                profession: "SAL",
                net_mothlyincome: lead.income || "30000",
            };
            const lendingPlateOfferRes = await axios.post(punchAPI, lendingPlateOfferReq, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer 1c0fb89cb720d1f59dffcee1fa4bdca768a81230754bbcf743511160da4dbd77",
                },
            });

            console.log(lendingPlateOfferRes.data);
            response.punch = lendingPlateOfferRes.data["Message"];
            response.preason = lendingPlateOfferRes.data?.reason;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            response.punch = errorMessage;
        }
    }

    return response;
}

async function processBatch(users) {
    const promises = users.map((user) => lendingPlateInject(user));
    const results = await Promise.all(promises);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const response = results[i];
        console.log("User:", user.phone);
        console.log(response);

        const updateResult = await User.updateOne(
            { phone: String(user.phone), "accounts.name": "LendingPlate" },
            {
                $set: {
                    "accounts.$.message": response.punch ?? response.dedupe,
                    "accounts.$.resp_date": new Date(),
                },
            },
        );

        if (updateResult.matchedCount === 0) {
            await User.updateOne(
                { phone: String(user.phone) },
                {
                    $push: {
                        accounts: {
                            name: "LendingPlate",
                            message: response.punch ?? response.dedupe,
                            resp_date: new Date(),
                        },
                    },
                },
            );
        }
    }
}
async function getValidPincodes() {
    try {
        const siblingDb = mongoose.connection.useDb("Pincode_Master");
        const validPincodes = await siblingDb.collection("LendingPlate").distinct("pincode");
        return validPincodes;
    } catch (error) {
        console.error("Error fetching valid pincodes:", error);
        throw error;
    }
}

async function loop() {
    let validPincodes = await getValidPincodes();
    validPincodes = validPincodes.map(String);
    try {
        let hasMoreLeads = true;

        while (hasMoreLeads) {
            console.log("agg...");
            const lender = "LendingPlate";
            const age = [21, 58];
            const income = 20000;
            const leads = await User.aggregate([
                {
                    $match: {
                        partner: "MoneyTap",
                        "accounts.name": { $ne: lender },
                        employment: "Salaried",
                        createdAt: { $gte: new Date("2025-03-01") },
                        pincode: { $in: validPincodes },
                    },
                },
                {
                    $addFields: {
                        age: {
                            $let: {
                                vars: { dob: { $dateFromString: { dateString: "$dob", onError: null, onNull: null } } },
                                in: {
                                    $cond: [
                                        { $not: "$$dob" },
                                        null,
                                        { $subtract: [{ $year: new Date() }, { $year: "$$dob" }] },
                                    ],
                                },
                            },
                        },
                        income2: { $convert: { input: "$income", to: "int", onError: null, onNull: null } },
                    },
                },
                { $match: { age: { $gte: age[0], $lte: age[1] }, income2: { $gte: income } } },
                { $limit: 1000 },
            ]);
            console.log(leads.length);
            if (leads.length === 0) {
                hasMoreLeads = false;
            } else {
                for (let i = 0; i < leads.length; i += BATCH_SIZE) {
                    const batch = leads.slice(i, i + BATCH_SIZE);
                    await processBatch(batch);
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        console.error("General Error:", error);
    } finally {
        mongoose.connection.close();
    }
}

loop();
