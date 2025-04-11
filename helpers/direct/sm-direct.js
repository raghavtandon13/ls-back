const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../../models/user.model");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;
const BATCH_SIZE = 100;
const HOST = "https://leads.smartcoin.co.in";

mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

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

async function processBatch(users) {
    const promises = users.map((user) => smInject(user));
    const results = await Promise.all(promises);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const response = results[i];
        console.log("User:", user.phone);
        console.log(response);

        const userRecord = await User.findOne({ phone: String(user.phone) });
        if (userRecord) {
            const accountIndex = userRecord.accounts.findIndex((account) => account.name === "SmartCoin");
            const newAccountData = { name: "SmartCoin", ...response, resp_date: new Date() };

            if (accountIndex !== -1) userRecord.accounts[accountIndex] = newAccountData;
            else userRecord.accounts.push(newAccountData);

            userRecord.refArr.push({ name: "sm_19mar", date: new Date() });
            await userRecord.save();
        }
    }
}

async function loop() {
    try {
        let hasMoreLeads = true;
        while (hasMoreLeads) {
            const leads = await User.find({
                accounts: { $elemMatch: { name: "SmartCoin", resp_date: { $lte: new Date("2025-02-18") } } },
                "refArr.name": { $ne: "sm_19mar" },
            })
                .sort({ updatedAt: -1 })
                .limit(BATCH_SIZE);
            console.log(leads.length);
            if (leads.length === 0) hasMoreLeads = false;
            else {
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
