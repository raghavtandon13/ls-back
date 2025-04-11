const router = require("express").Router();
const User = require("../models/user.model");
const { getLenders, sendLeads, addtoDB, logToFile, checkLeadAuth } = require("./leads_helpers.js");

// ROUTES

router.get("/", (_req, res) => res.json({ type: "success", message: "leads service is running" }));

router.post("/inject", checkLeadAuth, async function (req, res) {
    const { lead } = req.body;
    try {
        const [dbPromise] = await Promise.allSettled([addtoDB(lead, req.partner)]);
        const dbRes = dbPromise.status === "fulfilled" ? dbPromise.value : `Error: ${dbPromise.reason.message}`;
        console.log(dbRes);
        const allRes = { status: "success", _id: dbRes._id };
        res.status(200).json(allRes);
    } catch (error) {
        console.error("Error during injection:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post("/inject2", async function (req, res) {
    try {
        const responseData = await handleLeadInjection2(req);
        res.status(200).json(responseData);
    } catch (error) {
        console.error("Error during injection:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post("/inject_choose", checkLeadAuth, async function (req, res) {
    try {
        const responseData = await handleLeadInjectionChoose(req.body);
        res.status(200).json(responseData);
    } catch (error) {
        console.error("Error during injection:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post("/inject_by_id", checkLeadAuth, async function (req, res) {
    try {
        const responseData = await handleLeadInjectionById(req.body);
        res.status(200).json(responseData);
    } catch (error) {
        console.error("Error during injection:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post("/get_by_id", checkLeadAuth, async function (req, res) {
    try {
        if (req.body.id === undefined) return res.status(400).json({ error: "No ID Provided" });
        const lead = await User.findById(req.body.id).sort({ createdAt: -1 }).limit(1);

        if (lead.length === 0) {
            console.log("No lead found.");
            res.status(404).json({ error: "No Lead Found" });
            return;
        }

        const leadData = {
            lead: {
                phone: lead.phone,
                firstName: lead.name.split(" ")[0],
                lastName: lead.name.split(" ")[1],
                dob: lead.dob,
                email: lead.email,
                gender: lead.gender ? lead.gender.toUpperCase() : "MALE",
                city: lead.city,
                state: lead.state ? lead.state.toUpperCase() : "HARYANA",
                pincode: lead.pincode,
                pan: lead.pan,
                empName: lead.company_name,
                salary: lead.income,
                employment: !lead.employment
                    ? "Salaried"
                    : lead.employment === "Self-employed"
                      ? "Self Employed"
                      : lead.employment,
            },
        };

        res.status(200).json(leadData);
    } catch (error) {
        console.error("Error during get lead:", error);
        res.status(500).json({ error: error.message });
    }
});

// HANDLERS

async function handleLeadInjection2(req) {
    const { lead } = req.body;
    if (!lead || !lead.dob || !lead.salary || lead.pincode) {
        throw new Error("Insufficient Data");
    }

    const lenders = getLenders(lead);
    if (lenders.length === 0) {
        throw new Error("Not Eligible for any lenders.");
    }

    console.log(lead.phone, " lenders: ", lenders);

    const allRes = await sendLeads(lenders, lead);
    logToFile(allRes);
    return allRes;
}

async function handleLeadInjectionChoose(body, partner) {
    const { lead } = body;
    // if (lenders.length === 0) throw new Error("Lenders list is empty.");

    const lenders = ["SmartCoin", "MPocket", "Zype", "FatakPay"];
    const [dbPromise] = await Promise.allSettled([addtoDB(lead, partner)]);
    const dbRes = dbPromise.status === "fulfilled" ? dbPromise.value : `Error: ${dbPromise.reason.message}`;
    const allRes = await sendLeads(lenders, lead);
    allRes.db = dbRes._id;
    logToFile(allRes);
    return allRes;
}

async function handleLeadInjectionById(body) {
    const { userId, lenders = [] } = body;
    if (lenders.length === 0) throw new Error("Lenders list is empty.");

    if (userId === undefined) throw new Error("No ID Provided");
    const lead = await User.findById(userId).sort({ createdAt: -1 }).limit(1);

    if (lead.length === 0) {
        console.log("No lead found.");
        throw new Error("No Lead Found");
    }

    const leadData = {
        lead: {
            phone: lead.phone,
            firstName: lead.name.split(" ")[0],
            lastName: lead.name.split(" ")[1],
            dob: lead.dob,
            email: lead.email,
            gender: lead.gender ? lead.gender.toUpperCase() : "MALE",
            city: lead.city,
            state: lead.state ? lead.state.toUpperCase() : "HARYANA",
            pincode: lead.pincode,
            pan: lead.pan,
            empName: lead.company_name,
            salary: lead.income,
            employment: !lead.employment
                ? "Salaried"
                : lead.employment === "Self-employed"
                  ? "Self Employed"
                  : lead.employment,
        },
    };
    const allRes = await sendLeads(lenders, leadData.lead);
    logToFile(allRes);
    return allRes;
}

module.exports = { router, handleLeadInjectionChoose };
