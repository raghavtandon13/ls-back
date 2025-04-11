// Imports
const router = require("express").Router();

// Routes
// const abhi = require("./partnerRoutes/abhiloans");
// const cashe = require("./partnerRoutes/cashe");
// const creditsaison = require("./partnerRoutes/creditsaison");
// const faircent = require("./partnerRoutes/faircent");
// const fatakpay = require("./partnerRoutes/fatakpay");
// const fibe = require("./partnerRoutes/fibe");
// const finnable = require("./partnerRoutes/finnable");
// const finzy = require("./partnerRoutes/finzy");
// const lendingkart = require("./partnerRoutes/lendingkart");
// const loantap = require("./partnerRoutes/loantap");
// const moneytap = require("./partnerRoutes/moneytap");
// const moneyview = require("./partnerRoutes/moneyview");
// const moneywide = require("./partnerRoutes/moneywide");
// const mpocket = require("./partnerRoutes/mpocket");
// const payme = require("./partnerRoutes/payme");
// const payucredit = require("./partnerRoutes/payucredit");
// const prefr = require("./partnerRoutes/prefr");
const ram = require("./partnerRoutes/ramfincorp");
// const upwards = require("./partnerRoutes/upwards");
// const upwards2 = require("./partnerRoutes/upwards2");
// const vitto = require("./partnerRoutes/vitto");
// const zype = require("./partnerRoutes/zype");
// const creditlinks = require("./partnerRoutes/creditlinks");
// const lendenclub = require("./partnerRoutes/lendenclub");
// const smartcoin = require("./partnerRoutes/smartcoin");

// router.use("/abhiloans", abhi);
// router.use("/cashe", cashe);
// router.use("/creditsaison", creditsaison);
// router.use("/faircent", faircent);
// router.use("/fatakpay", fatakpay);
// router.use("/fibe", fibe);
// router.use("/finnable", finnable);
// router.use("/finzy", finzy);
// router.use("/lendingkart", lendingkart);
// router.use("/loantap", loantap);
// router.use("/moneytap", moneytap);
// router.use("/moneyview", moneyview);
// router.use("/moneywide", moneywide);
// router.use("/mpocket", mpocket);
// router.use("/payme", payme);
// router.use("/payucredit", payucredit);
// router.use("/prefr", prefr);
router.use("/ram", ram);
// router.use("/upwards", upwards);
// router.use("/upwards2", upwards2);
// router.use("/vitto", vitto);
// router.use("/zype", zype);
// router.use("/creditlinks", creditlinks);
// router.use("/lendenclub", lendenclub);
// router.use("/smartcoin", smartcoin);

// Welcome
router.get("/", function (_req, res) {
    res.send("partnerapi service is running");
});

module.exports = router;
