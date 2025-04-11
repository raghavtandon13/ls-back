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
const domain = "https://api.bharatloanfintech.com";
const headers = {
    Username: "CREDITMANTRA_20250217",
    Auth: "534c0fc444ffb5432a6b690e78d2847499b0626092491463e970f5cf8c3d85b6",
    Content_Type: "application/json",
};

async function rupee112Inject(lead) {
    try {
        const r112DedupeReq = { mobile: parseInt(lead.phone), pancard: lead.pan };
        console.log(r112DedupeReq);
        const r112DedupeRes = await axios.post(`${domain}/marketing-check-dedupe/`, r112DedupeReq, {
            headers: headers,
        });
        console.log(r112DedupeRes.data);
        if (r112DedupeRes.data["Message"] !== "User not found") return r112DedupeRes.data;
        const r112punchReq = {
            full_name: lead.name,
            mobile: lead.phone,
            mobile_verification_flag: "0",
            email: lead.email,
            pancard: lead.pan,
            pincode: lead.pincode,
            income_type: "1",
            purpose_of_loan: "7",
            monthly_salary: lead.income || "30000",
            loan_amount: "20000",
            customer_lead_id: `cm-${Math.random().toString(36).substr(2, 9)}`,
        };
        console.log(r112punchReq);
        const r112punchRes = await axios.post(`${domain}/marketing-push-data/`, r112punchReq, {
            headers: headers,
        });
        return r112punchRes.data;
    } catch (error) {
        console.error(error);
        const errorMessage = error.response?.data?.message || error.message;
        return { message: errorMessage };
    }
}

async function processBatch(users) {
    const promises = users.map(async (user) => {
        const lead = await User.findOne({ phone: user.mobile });

        return rupee112Inject(lead);
    });
    const results = await Promise.all(promises);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const response = results[i];
        console.log("User:", user.mobile);
        console.log(response);

        await User.updateOne(
            { phone: String(user.mobile) },
            {
                $push: {
                    accounts: { name: "BharatPay", ...response, resp_date: new Date() },
                    refArr: { name: "BP_20000", date: new Date() },
                },
            },
            { upsert: true },
        );
    }
}

async function loop() {
    const client = new MongoClient(NEW_MONGODB_URI);

    try {
        await client.connect();
        const database = client.db("test");
        const collection = database.collection("FatakPay PL PA Data");

        const leads = await collection
            .find({ SCORE_VALUE: { $gt: 650 } })
            .limit(20000)
            .toArray();
        console.log(leads.map((lead) => lead.mobile));
        console.log(leads.length);
        if (leads.length === 0) {
            hasMoreLeads = false;
        } else {
            for (let i = 0; i < leads.length; i += BATCH_SIZE) {
                const batch = leads.slice(i, i + BATCH_SIZE);
                await processBatch(batch);
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
