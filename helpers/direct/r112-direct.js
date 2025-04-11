const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

const BATCH_SIZE = 1;
const domain = "https://api.rupee112fintech.com/";
const headers = {
    Username: "CREDITMANTRA_20250217",
    Auth: "534c0fc444ffb5432a6b690e78d2847499b0626092491463e970f5cf8c3d85b6",
    Content_Type: "application/json",
};

async function rupee112Inject(lead) {
    try {
        const r112DedupeReq = { mobile: parseInt(lead.phone) };
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
    const promises = users.map((user) => rupee112Inject(user));
    const results = await Promise.all(promises);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const response = results[i];
        console.log("User:", user.phone);
        console.log(response);

        await User.updateOne(
            { phone: user.phone },
            {
                $push: {
                    accounts: {
                        name: "R112",
                        ...response,
                        resp_date: new Date(),
                    },
                    refArr: {
                        name: "R112_20000",
                        date: new Date(),
                    },
                },
            },
            { upsert: true },
        );
    }
}

async function loop() {
    // const client = new MongoClient(NEW_MONGODB_URI);

    try {
        let hasMoreLeads = true;

        while (hasMoreLeads) {
            const leads = await User.aggregate([
                { $match: { "refArr.name": { $ne: "R112_20000" } } },
                {
                    $addFields: {
                        income: { $toInt: "$income" },
                        age: {
                            $let: {
                                vars: { dob: { $dateFromString: { dateString: "$dob" } } },
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
                { $match: { age: { $gte: 25, $lte: 50 }, mpkt: { $ne: true } } },
                { $project: { _id: 1, name: 1, phone: 1, email: 1, dob: 1, pan: 1, income: 1, pincode: 1 } },
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
                // Add a delay between batches to avoid overwhelming the server
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        console.error("General Error:", error);
    } finally {
        // await client.close();
        mongoose.connection.close();
    }
}

loop();
