const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;

/*
1. read a  file to get lapId, read it one my one, later we can make batches
2. for each lapid get the user, using  user.find({
"accounts.loan_application_id": lapId
})
3. for each user get thiir accounts array and map of each account to which accounts they were "accepted" in.
Config for know weather an account is accepted or not:

branches: [
    // FIBE CONDITIONS
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Fibe"] },
                { $eq: ["$$account.res.reason", "customer lead created"] },

            ],
        },
        then: "Accepted",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Fibe"] },
                { $eq: ["$$account.res.reason", "customer lead updated"] },

            ],
        },
        then: "Accepted",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Fibe"] },
                {
                    $regexMatch: {
                        input: "$$account.res.reason",
                        regex: /(salary|pincode|Pan|Age|Invalid)/i,
                    },
                },

            ],
        },
        then: "Rejected",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Fibe"] },
                { $eq: ["$$account.res.reason", "customer already exists"] },

            ],
        },
        then: "Deduped",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Fibe"] },
                { $eq: ["$$account.res.reason", "Duplicate request"] },

            ],
        },
        then: "Deduped",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Fibe"] },
                { $ne: ["$$account.res.errorMessage", null] },

            ],
        },
        then: "Errors",
    },
    // RAMFIN CONDITIONS
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "RamFin"] },
                { $eq: ["$$account.msg", "Lead created successfully."] },

            ],
        },
        then: "Accepted",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "RamFin"] },
                { $eq: ["$$account.res.message", "Lead created successfully."] },

            ],
        },
        then: "Accepted",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "RamFin"] },
                { $eq: ["$$account.status", "Ineligible"] },

            ],
        },
        then: "Rejected",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "RamFin"] },
                { $eq: ["$$account.status", "Dedupe"] },

            ],
        },
        then: "Deduped",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "RamFin"] },
                { $ne: ["$$account.lead_status", null] },

            ],
        },
        then: "Accepted",
    },
    // FATAKPAY CONDITIONS
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "FatakPay"] },
                { $eq: ["$$account.status", "Eligible"] },

            ],
        },
        then: "Accepted",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "FatakPay"] },
                { $eq: ["$$account.status", "Ineligible"] },

            ],
        },
        then: "Rejected",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "FatakPay"] },
                { $eq: ["$$account.status", "Deduped"] },

            ],
        },
        then: "Deduped",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "FatakPay"] },
                { $ne: ["$$account.stage_name", null] },

            ],
        },
        then: "Accepted",
    },
    // SMARTCOIN CONDITIONS
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "SmartCoin"] },
                { $eq: ["$$account.isDuplicateLead", "true"] },

            ],
        },
        then: "Deduped",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "SmartCoin"] },
                { $eq: ["$$account.isDuplicateLead", "false"] },

            ],
        },
        then: "Accepted",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "SmartCoin"] },
                { $eq: ["$$account.message", "Lead created successfully"] },

            ],
        },
        then: "Accepted",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "SmartCoin"] },
                {
                    $regexMatch: {
                        input: "$$account.message",
                        regex: /(mandatory)/i,
                    },
                },

            ],
        },
        then: "Errors",
    },
    // ZYPE CONDITIONS
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Zype"] },
                { $eq: ["$$account.status", "ACCEPT"] },

            ],
        },
        then: "Accepted",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Zype"] },
                { $eq: ["$$account.message", "REJECT"] },

            ],
        },
        then: "Rejected",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Zype"] },
                { $eq: ["$$account.status", "REJECT"] },

            ],
        },
        then: "Rejected",
    },
    // CASHE CONDITIONS
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Cashe"] },
                { $eq: ["$$account.status", "pre_approved"] },

            ],
        },
        then: "Accepted",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Cashe"] },
                { $eq: ["$$account.status", "pre_qualified_low"] },

            ],
        },
        then: "Accepted",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Cashe"] },
                { $eq: ["$$account.status", "rejected"] },

            ],
        },
        then: "Rejected",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Cashe"] },
                {
                    $regexMatch: {
                        input: "$$account.res.status",
                        regex: /(ERROR)/i,
                    },
                },

            ],
        },
        then: "Erros",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Cashe"] },
                { $eq: ["$$account.res.payload.status", "rejected"] },

            ],
        },
        then: "Rejected",
    },
    // MPOCKET CONDITIONS
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Mpocket"] },
                { $eq: ["$$account.message", "User Eligible for Loan"] },

            ],
        },
        then: "Accepted",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Mpocket"] },
                { $eq: ["$$account.message", "New User"] },

            ],
        },
        then: "Accepted",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Mpocket"] },
                { $eq: ["$$account.message", "Data Accepted Successfully"] },

            ],
        },
        then: "Accepted",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Mpocket"] },
                { $eq: ["$$account.message", "User Profile Rejected on System"] },

            ],
        },
        then: "Rejected",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Mpocket"] },
                { $eq: ["$$account.message", "User Not Eligible for Loan"] },

            ],
        },
        then: "Rejected",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "Mpocket"] },
                {
                    $or: [
                        { $eq: ["$$account.message", null] },
                        { $not: ["$$account.message"] },
                    ],
                },

            ],
        },
        then: "Rejected",
    },
    // MONEYVIEW CONDITIONS
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "MoneyView"] },
                {
                    $or: [
                        { $eq: ["$$account.message", null] },
                        { $not: ["$$account.message"] },
                    ],
                },

            ],
        },
        then: "Rejected",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "MoneyView"] },
                { $eq: ["$$account.message", "Lead has been rejected."] },

            ],
        },
        then: "Rejected",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "MoneyView"] },
                { $regexMatch: { input: "$$account.message", regex: /(nvalid)/i } },

            ],
        },
        then: "Erros",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "MoneyView"] },
                { $eq: ["$$account.message", "Lead has been expired."] },

            ],
        },
        then: "Rejected",
    },
    {
        case: {
            $and: [
                { $eq: ["$$account.name", "MoneyView"] },
                { $eq: ["$$account.message", "success"] },

            ],
        },
        then: "Accepted",
    },
],
finally give me the names of accepted lenders per user in a n array
so finally i should get result like this:
[
{
phone: 1234567890, // cuurent user's phone number
acceptedLenders: ["Fibe", "RamFin", "FatakPay"] // acc to config this user was only accpeted in these lenders
},.... so on
]

*/
