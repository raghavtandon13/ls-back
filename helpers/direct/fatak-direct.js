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
const domain = "https://onboardingapi.fatakpay.com/external-api/v1";

async function get_token() {
    try {
        const data = {
            username: "CredMantra",
            password: "b9aa65423a064641f5ff",
        };
        const apires = await axios.post(`${domain}/create-user-token`, data);
        return apires.data.data.token;
    } catch (error) {
        throw new Error(error.message);
    }
}

async function fatakInject(lead) {
    // console.log(lead);
    const token = await get_token();
    try {
        const fatakpayReq = {
            mobile: parseInt(lead.phone),
            first_name: lead.name.split(" ")[0],
            last_name: lead.name.split(" ")[1],
            gender: lead.gender ? (lead.gender === 0 ? "Male" : "Female") : "Male",
            email: lead.email,
            employment_type_id: "Salaried",
            pan: lead.pan,
            dob: lead.dob ? lead.dob.toISOString().split("T")[0] : "1999-01-03",
            pincode: parseInt(lead.pincode) || 110001,
            consent: true,
            consent_timestamp: lead.consent || new Date().toISOString(),
        };
        const fatakpayRes = await axios.post(`${domain}/emi-insurance-eligibility`, fatakpayReq, {
            headers: { Authorization: `Token ${token}` },
        });
        return fatakpayRes.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        return { message: errorMessage };
    }
}

async function processBatch(users, collection) {
    const promises = users.map((user) => fatakInject(user));
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
                        name: "FatakPay",
                        ...response,
                        resp_date: new Date(),
                    },
                    refArr: {
                        name: "RamFinNEWshizuFP",
                        date: new Date(),
                    },
                },
            },
            { upsert: true },
        );

        // Mark the lead as processed
        await collection.updateOne({ _id: user._id }, { $set: { fatak: true } });
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
                    { $match: { age: { $gte: 18, $lte: 60 }, fatak: { $ne: true } } },
                    { $project: { _id: 1, name: 1, phone: 1, email: 1, dob: 1, pan: 1 } },
                    { $limit: 1000 },
                ])
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
