const axios = require("axios");
const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
const NEW_MONGODB_URI = "mongodb+srv://ceo:m1jZaiWN2ulUH0ux@cluster0.2vjepfe.mongodb.net/extra";

mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

const BATCH_SIZE = 100;
const RAMFIN_API_URL = "https://www.ramfincorp.com/loanapply/ramfincorp_api/lead_gen/api/v1/create_lead";
const RAMFIN_API_AUTH =
    "Basic cmFtZmluXzFiMjBiMjJjMDVhYzUyNmMxMjBkOGNjZTRiOTg5MzBhOjBiNzIzMWE3YzA3NDZlZGIyMzMwOWQ0MWM3NTZiMGM1ZDA5OWRlNWY=";

async function ramInject(lead) {
    const ramReq = {
        name: lead.name,
        mobile: lead.phone,
        loanAmount: "200000",
        email: lead.email,
        employeeType: "Salaried",
        dob: lead.dob ? lead.dob.toISOString().slice(0, 10) : "1999-01-01",
        pancard: lead.pan,
    };

    try {
        const ramRes = await axios.post(RAMFIN_API_URL, ramReq, {
            headers: {
                Authorization: RAMFIN_API_AUTH,
            },
        });

        return ramRes.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        if (errorMessage === "User already associated with us.") return { message: "Dedupe" };
        if (errorMessage === "Eligibility criteria failed.") return { message: "Ineligible" };
        return { message: errorMessage };
    }
}

async function processBatch(users, collection) {
    const promises = users.map(async (user) => {
        const lead = await User.find({ phone: user.phone });
        return await ramInject(lead);
    });
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
                        name: "RamFin",
                        status: response.status === "1" ? "success" : "failure",
                        msg: response.message,
                        resp_date: new Date(),
                    },
                    refArr: {
                        name: "RamFinNEWshizu",
                        date: new Date(),
                    },
                },
            },
            { upsert: true },
        );

        // Mark the lead as processed
        await collection.updateOne({ _id: user._id }, { $set: { processed: true } });
    }
}

async function loop() {
    const client = new MongoClient(NEW_MONGODB_URI);

    try {
        await client.connect();
        const database = client.db("Testt");
        const collection = database.collection("Pln");

        let hasMoreLeads = true;

        while (hasMoreLeads) {
            const leads = await collection
                .find({ leads_date: { $lt: Date("2025-01-20") } })
                .limit(1000)
                .toArray();
            if (leads.length === 0) hasMoreLeads = false;
            else {
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
