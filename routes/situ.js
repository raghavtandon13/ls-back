const router = require("express").Router();
const filterLenders = require("../utils/lenderlist.util");
const User = require("../models/user.model");
const axios = require("axios");

router.post("/getOffers", async (req, res) => {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ type: "error", message: "User not found" });
    if (!user.dob || !user.income || !user.pincode)
        return res.status(200).json({ type: "failure", data: "dob income pincode mandatory " });

    const AIPlendersList = await filterLenders(user.dob, parseInt(user.income), parseInt(user.pincode));
    const usedLenderList = await usedLenders(user.accounts);
    const AIPnotUsedList = AIPlendersList.filter((lender) => !usedLenderList.includes(lender));
    const finalList = await filterDedupe(AIPnotUsedList, user);

    console.log("AIPlendersList:", AIPlendersList);
    console.log("usedLenderList:", usedLenderList);
    console.log("AIPnotUsedList:", AIPnotUsedList);

    res.status(200).json({ type: "success", data: finalList });
});

async function usedLenders(accounts) {
    return accounts.map((account) => account.name);
}

async function filterDedupe(list, user) {
    // list = ["SmartCoin", "MPocket", "Zype", "FatakPay"];
    return await sendLeads(list, user);
}

async function sendLeads(lenderList, user) {
    const promises = lenderList.map((lender) => injectLead(lender, user));
    const results = await Promise.allSettled(promises);
    const allRes = processResults(lenderList, results);
    return allRes;
}

async function injectLead(lender, lead) {
    try {
        switch (lender) {
            case "SmartCoin":
                return await smartcoinInject(lead);
            case "Mpocket":
                return await mpocketInject(lead);
        }
    } catch (error) {
        console.error(`Error injecting lead for ${lender}:`, error);
        return { status: "rejected", reason: error.message };
    }
}

async function smartcoinInject(lead) {
    const smDedupeURL = "https://credmantra.com/api/v1/partner-api/smartcoin/smartcoin/dedupe";
    const smDedupeReq = {
        phone_number: lead.phone,
        pan: lead.pan,
        employement_type: "SALARIED",
        net_monthly_income: lead.income || "30000",
        date_of_birth: lead.dob || "",
        name_as_per_PAN: lead.name || "",
    };
    const smDedupeRes = await axios.post(smDedupeURL, smDedupeReq);
    console.log(smDedupeRes.data);
    return smDedupeRes.data.isDuplicateLead === "false";
}

async function mpocketInject(lead) {
    // implement mpocket dedupe
    return true;
}

function processResults(lenders, results) {
    const allRes = {};
    lenders.forEach((lender, index) => {
        const result = results[index];
        allRes[lender.toLowerCase()] = result.status === "fulfilled" ? result.value : `Error: ${result.reason.message}`;
    });
    return allRes;
}

module.exports = router;
