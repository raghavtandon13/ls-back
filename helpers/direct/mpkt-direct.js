const axios = require("axios");
const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");
const User = require("../../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
const NEW_MONGODB_URI = "mongodb+srv://ceo:m1jZaiWN2ulUH0ux@cluster0.2vjepfe.mongodb.net/extra";

mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

const BATCH_SIZE = 100;
const domain = "api.mpkt.in";
const headers = { "Content-Type": "application/json", "api-key": "3BB5E7A7E44345988BC9111F4C975 " };

async function mpktInject(lead) {
    try {
        const mpktDedupeReq = {
            email_id: Buffer.from(lead.email).toString("base64"),
            mobile_number: Buffer.from(String(lead.phone)).toString("base64"),
        };
        const mpktRes = await axios.post(`https://${domain}/acquisition-affiliate/v1/dedupe/check`, mpktDedupeReq, {
            headers: headers,
        });
        console.log(mpktRes.data);
        if (mpktRes.data.message !== "New user") return mpktRes.data;
        const leadReq = {
            email_id: lead.email,
            mobile_no: lead.phone,
            full_name: lead.firstName + " " + lead.lastName,
            date_of_birth: lead.dob,
            gender: lead.gender.toLowerCase(),
            profession: "salaried",
        };
        const leadRes = await axios.post(`https://${domain}/acquisition-affiliate/v1/user`, leadReq);
        return leadRes.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        return { message: errorMessage };
    }
}

async function processBatch(users, collection) {
    const promises = users.map((user) => mpktInject(user));
    const results = await Promise.all(promises);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const response = results[i];
        console.log("User:", user.phone);
        console.log(response);

        await User.updateOne(
            { phone: String(user.phone) },
            {
                $set: {
                    name: user.name,
                    phone: user.phone,
                    email: user.email,
                    dob: user.dob.toISOString().slice(0, 10),
                    pan: user.pan,
                },
                $push: {
                    accounts: {
                        name: "Mpocket",
                        ...response,
                        resp_date: new Date(),
                    },
                    refArr: {
                        name: "RamFinNEWshizuMPKT",
                        date: new Date(),
                    },
                },
            },
            { upsert: true },
        );

        // Mark the lead as processed
        await collection.updateOne({ _id: user._id }, { $set: { mpkt: true } });
    }
}

async function loop() {
    const client = new MongoClient(NEW_MONGODB_URI);

    try {
        await client.connect();
        const database = client.db("extra");
        const collection = database.collection("aData");

        let hasMoreLeads = true;

        while (hasMoreLeads) {
            const leads = await collection
                .aggregate([
                    { $match: { mpkt: { $ne: true } } },
                    {
                        $addFields: {
                            age: {
                                $let: {
                                    vars: { dob: "$dob" },
                                    in: {
                                        $cond: [
                                            { $not: "$$dob" },
                                            null,
                                            { $subtract: [{ $year: new Date() }, { $year: "$$dob" }] },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                    { $match: { age: { $gte: 18, $lte: 60 }, mpkt: { $ne: true } } },
                    { $project: { _id: 1, name: 1, phone: 1, email: 1, dob: 1, pan: 1 } },
                    { $limit: 1000 },
                ])
                .toArray();
            console.log(leads.length);
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
