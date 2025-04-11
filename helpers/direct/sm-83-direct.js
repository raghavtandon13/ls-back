const axios = require("axios");
const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");
const User = require("../../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
const NEW_MONGODB_URI = "mongodb+srv://ceo:m1jZaiWN2ulUH0ux@cluster0.2vjepfe.mongodb.net/extra";

const HOST = "https://leads.smartcoin.co.in";
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

const BATCH_SIZE = 1;
const SM_DEDUPE_URL = `${HOST}/partner/credmantra/lead/dedup`;
const SM_CREATE_URL = `${HOST}/partner/credmantra/lead/create`;
const SM_HEADERS = {
    "admin-api-client-id": "SC_CRMN_6hY8gF3dR1sA3jL",
    "admin-api-client-key": "3cV6zN9mB4qI6kH",
    "Content-Type": "application/x-www-form-urlencoded",
};

async function smInject(lead) {
    try {
        const smDedupeReq = {
            phone_number: lead.phone,
            pan: lead.pan,
            employement_type: "SALARIED",
            net_monthly_income: lead.income || "30000",
            date_of_birth: lead.dob,
            name_as_per_PAN: lead.name || "",
        };
        console.log(smDedupeReq);
        const params = new URLSearchParams();
        for (const key in smDedupeReq) {
            params.append(key, smDedupeReq[key]);
        }
        const smDedupeRes = await axios.post(SM_DEDUPE_URL, params, { headers: SM_HEADERS });

        if (smDedupeRes.data.isDuplicateLead === "false") {
            const smOfferReq = {
                phone_number: lead.phone,
                pan: lead.pan,
                email: lead.email,
                loan_amount: "200000",
                loan_tenure: "12",
                employement_type: "SALARIED",
                net_monthly_income: lead.income || "30000",
                date_of_birth: lead.dob || "",
                name_as_per_PAN: lead.name || "",
            };

            const sm_params = new URLSearchParams();
            for (const key in smOfferReq) {
                sm_params.append(key, smOfferReq[key]);
            }
            const smCreateRes = await axios.post(SM_CREATE_URL, sm_params, { headers: SM_HEADERS });
            return smCreateRes.data;
        }
        return smDedupeRes.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        return { message: errorMessage };
    }
}

async function processBatch(users, collection) {
    const promises = users.map(async (user) => {
        const lead = await User.findOne({ phone: user.phone });
        if (!lead) {
            return { status: "user not found" };
        }
        return await smInject(lead);
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

        await User.updateOne(
            { phone: String(user.phone) },
            {
                $push: {
                    accounts: { name: "SmartCoin", ...response, resp_date: new Date() },
                    refArr: { name: "83SM", date: new Date() },
                }
            },
            { upsert: true },
        );

        // Mark the lead as processed
        await collection.updateOne({ _id: user._id }, { $set: { sm: true } });
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
                .find({ sm: { $ne: true } })
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
