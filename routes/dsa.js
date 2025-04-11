const express = require("express");
const { handleLeadInjectionChoose } = require("./leads_new");
const router = express.Router();
const User = require("../models/user.model");
const Dsa = require("../models/dsa.model");

router.post("/submit", async function (req, res) {
    const { lenders, lead, subId } = req.body;
    //  TODO: check if subId is valid or not. maintain a registry
    const users = await User.find({ phone: lead.phone });
    let dedupe = true;
    if (users.length === 0) {
        dedupe = false;
    }

    console.log(lead, lenders, subId);
    const data = handleLeadInjectionChoose({ lead, lenders }, subId);
    //  TODO: also check if curr user.partner === subId to make sure sub dsa got registered

    const resp = {
        status: dedupe ? "lead already exists" : "new lead created",
        subId: subId,
        lenders: data,
    };
    res.json(resp);
});

router.post("/register", async function (req, res) {
    const { body } = req.body;
    const dsas = await Dsa.find({ aadhar: body.aadhar });
    //  TODO: check if aadhar dedupe
    let dedupe = true;
    if (dsas.length === 0) {
        dedupe = false;
    }

    //  TODO: correctly add all details to dsa model
    //  TODO: generate refferal id and add to dsa model
    const dsa = await new Dsa({ body });
    dsa.save();

    const resp = {
        status: "created",
        msg: "new dsa account created",
        refferalId: dsa.refferal_id,
        link: dsa.link,
    };
    res.json(resp);
});

module.exports = router;
