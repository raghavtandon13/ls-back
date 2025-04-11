const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    endpoint: {
        type: String,
        required: true,
        unique: true,
    },
    keys: {
        p256dh: String,
        auth: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Subscription", subscriptionSchema);
