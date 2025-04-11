const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);
const BATCH_SIZE = 100;
// const LEADS_BASE_URL = "http://localhost:3001";
const LEADS_BASE_URL = "https://credmantra.com";

async function lendenInject(lead) {
    const lendenCreateURL = `${LEADS_BASE_URL}/api/v1/partner-api/lendenclub/create`;
    const state_code = await getState(parseInt(lead.pincode));
    // console.log(state_code);

    try {
        const lendenCreatePayload = {
            payload: {
                basic_details: {
                    mobile_number: lead.phone,
                    email: lead.email,
                    name: lead.name,
                    pan: lead.pan,
                    date_of_birth: lead.dob.split("-").reverse().join("/"),
                },
                address_details: {
                    type: "PERMANENT",
                    address_line: lead.city,
                    pincode: parseInt(lead.pincode),
                    state_code: state_code,
                },
                professional_details: {
                    occupation_type: "SALARIED",
                    company_name: lead.company_name ?? "OTHERS",
                    income: lead.income ?? 30000,
                },
                loan_details: { amount: lead.loan_amount ?? 10000 },
                consent_data: {
                    content: [
                        "I hereby declare that I am an Indian citizen. I acknowledge and accept CredMantra's Privacy Policy and T&Cs and authorize CredMantra to access my credit information from Credit Bureaus on my behalf. I also give permission to CredMantra to obtain my credit report from CRIF Highmark Private Limited, Experian Credit Information Company of India Private Limited, or TransUnion CIBIL Limited. By proceeding with verification, you agree to receive communications from us and/or our partners, including Banks and Non-Banking Financial Companies (NBFCs), via SMS, email, phone calls, or WhatsApp, regarding your transaction on the website or for any other related purpose. This consent will take precedence over any DNC/NDNC registration. I hereby declare that I am Indian National. I agree to CredMantra",
                    ],
                    consent_dtm: `${lead.consent}.000 +0530`,
                },
            },
            api_code: "CREATE_LEAD_API_V2",
        };

        const createRes = await axios.post(lendenCreateURL, lendenCreatePayload);
        return createRes.data;
    } catch (e) {
        return e.response?.data || e.message;
    }
}

async function processBatch(users) {
    const promises = users.map((user) => lendenInject(user));
    const results = await Promise.allSettled(promises);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const response = results[i];
        console.log("PHONE:", user.phone);
        if (response.status === "fulfilled") {
            console.log("Value:", response.value);
        } else {
            console.log("Reason:", response.reason);
        }
        console.log("--------------------------------------------");
    }
}

async function loop() {
    try {
        let users;
        do {
            console.log("finding ...");
            users = await User.find({
                partner: "MoneyTap",
                createdAt: { $gt: new Date("2025-03-01") },
                "accounts.name": { $ne: "LendenClub" },
            }).limit(1000);
            console.log(users.length);

            for (let i = 0; i < users.length; i += BATCH_SIZE) {
                const batch = users.slice(i, i + BATCH_SIZE);
                await processBatch(batch);
            }
        } while (users.length > 0);
    } catch (error) {
        console.error("General Error:", error);
    } finally {
        mongoose.connection.close();
    }
}

loop();

const stateCodeMapping = {
    "Andaman and Nicobar Islands": "AN",
    "Andhra Pradesh": "AP",
    "Arunachal Pradesh": "AR",
    Assam: "AS",
    Bihar: "BH",
    Chandigarh: "CH",
    Chattisgarh: "CT",
    "Dadra and Nagar Haveli": "DN",
    "Daman and Diu": "DD",
    Delhi: "DL",
    Goa: "GA",
    Gujarat: "GJ",
    Haryana: "HR",
    "Himachal Pradesh": "HP",
    "Jammu and Kashmir": "JK",
    Jharkhand: "JH",
    Karnataka: "KA",
    Kerala: "KL",
    Ladakh: "LA",
    "Lakshadweep Islands": "LD",
    "Madhya Pradesh": "MP",
    Maharashtra: "MH",
    Manipur: "MN",
    Meghalaya: "ME",
    Mizoram: "MI",
    Nagaland: "NL",
    Odisha: "OR",
    Pondicherry: "PY",
    Punjab: "PB",
    Rajasthan: "RJ",
    Sikkim: "SK",
    "Tamil Nadu": "TN",
    Telangana: "TL",
    Tripura: "TR",
    "Uttar Pradesh": "UP",
    Uttarakhand: "UT",
    "West Bengal": "WB",
};

async function getState(pincode) {
    try {
        const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);
        if (response.data[0].Status === "Success" && response.data[0].PostOffice.length > 0) {
            const postOffice = response.data[0].PostOffice[0];
            const stateName = postOffice.State;
            const stateCode = stateCodeMapping[stateName];
            return stateCode;
        } else {
            throw new Error("Invalid pincode or no data found");
        }
    } catch (error) {
        // console.error("Error fetching state" );
        return null;
    }
}
