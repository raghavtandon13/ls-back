const axios = require("axios");
const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");
const User = require("../../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
const NEW_MONGODB_URI = "mongodb+srv://ceo:m1jZaiWN2ulUH0ux@cluster0.2vjepfe.mongodb.net/extra";

mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

const BATCH_SIZE = 1;
const domain = "https://prod.zype.co.in/attribution-service";
const partnerId = "66603df5a5168dbb6e95ec25";

async function zypeInject(lead) {
    let response = {};
    try {
        const zypeDedupeReq = { mobileNumber: String(lead.phone), panNumber: lead.pan, partnerId };
        const zypeDedupeRes = await axios.post(`${domain}/api/v1/underwriting/customerEligibility`, zypeDedupeReq);
        response.dedupe = zypeDedupeRes.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        response.dedupe = errorMessage;
    }
    if (response.dedupe?.status === "ACCEPT" || response.dedupe?.message === "APPLICATION_ALREADY_EXISTS") {
        try {
            const zypeOfferReq = {
                mobileNumber: String(lead.phone),
                email: lead.email,
                panNumber: lead.pan,
                name: lead.name,
                dob: lead.dob,
                employmentType: "salaried",
                income: parseInt(lead.salary) || 30000,
                orgName: lead.empName || "COMPANY",
                bureauType: 3,
                partnerId,
            };
            const zypeOfferRes = await axios.post(`${domain}/api/v1/underwriting/preApprovalOffer`, zypeOfferReq);
            response.punch = zypeOfferRes.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            response.punch = errorMessage;
            if (response.punch !== "PRE_APPROVAL_OFFER_ALREADY_GENERATED") response.retry = true;
        }
    }

    return response;
}

async function processBatch(users, collection) {
    const promises = users.map(async (user) => {
        const lead = await User.findOne({ phone: user.phone });
        if (!lead) {
            return { status: "user not found" };
        }
        return await zypeInject(lead);
    });
    const results = await Promise.all(promises);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const response = results[i];
        console.log("User:", user.phone);
        console.log(response);
        if (response.status === "user not found") {
            continue;
        }

        if (!response.retry) {
            const updateResult = await User.updateOne(
                { phone: String(user.phone), "accounts.name": "Zype" },
                {
                    $set: {
                        name: user.name,
                        phone: user.phone,
                        email: user.email,
                        dob: user.dob ? user.dob.toString().slice(0, 10) : "1990-12-18",
                        pan: user.pan,
                        "accounts.$.message":
                            (response.punch ?? response.dedupe.message === "REJECT")
                                ? "DEDUPE"
                                : response.dedupe.message,
                        "accounts.$.resp_date": new Date(),
                    },
                    $push: {
                        refArr: {
                            name: "RamFinNEWshizuZP",
                            date: new Date(),
                        },
                    },
                },
            );

            if (updateResult.matchedCount === 0) {
                await User.updateOne(
                    { phone: String(user.phone) },
                    {
                        $set: {
                            name: user.name,
                            phone: user.phone,
                            email: user.email,
                            dob: user.dob ? user.dob.toString().slice(0, 10) : "1990-12-18",
                            pan: user.pan,
                        },
                        $push: {
                            accounts: {
                                name: "Zype",
                                message: response.punch || response.dedupe.message,
                                resp_date: new Date(),
                            },
                            refArr: {
                                name: "RamFinNEWshizuZP",
                                date: new Date(),
                            },
                        },
                    },
                );
            }

        // Mark the lead as processed
        await collection.updateOne({ _id: user._id }, { $set: { done: true } });
    }
}

async function loop() {
    const client = new MongoClient(NEW_MONGODB_URI);

    try {
        await client.connect();
        const database = client.db("Testt");
        const collection = database.collection("Approved_Ram");

        let hasMoreLeads = true;

        while (hasMoreLeads) {
            const leads = await collection
                .find({ zype: { $ne: true } })
                .limit(1000)
                .toArray();
            if (leads.length === 0) {
                hasMoreLeads = false;
            } else {
                for (let i = 0; i < leads.length; i += BATCH_SIZE) {
                    const batch = leads.slice(i, i + BATCH_SIZE);
                    await processBatch(batch, collection);
                }
                // Add a delay between batches to avoid overwhelming the server
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        console.error("General Error:", error);
    } finally {
        await client.close();
        mongoose.connection.close();
    }
}

loop();
