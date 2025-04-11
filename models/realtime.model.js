const { model, Schema } = require("mongoose");

const mongoose = require("mongoose");

const realTimeCountSchema = new mongoose.Schema({
    lender: String,
    status: String,
    partner: { type: String, default: null },
    date: { type: Date, default: Date.now },
    count: { type: Number, default: 0 },
});

const RealTimeCount = mongoose.model("RealTimeCount", realTimeCountSchema);

module.exports = RealTimeCount;
