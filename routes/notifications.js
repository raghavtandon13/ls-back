const express = require("express");
const router = express.Router();
const { sendNotification, webpush } = require("../utils/webPush");
const Subscription = require("../models/subscription"); // You'll need to create this model

// Endpoint to receive subscription from frontend
router.post("/subscribe", async (req, res) => {
    try {
        const { userId, subscription } = req.body;

        // Create and save subscription
        const newSubscription = new Subscription({
            userId,
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            },
        });

        await newSubscription.save();

        res.status(201).json({ message: "Subscribed successfully" });
    } catch (error) {
        res.status(500).json({ error: "Subscription failed" });
    }
});

// Endpoint to send a notification
function isValidSubscription(subscription) {
    return (
        subscription && subscription.endpoint && subscription.keys && subscription.keys.p256dh && subscription.keys.auth
    );
}

router.post("/send", async (req, res) => {
    try {
        const { userId, title, body } = req.body;

        // Find all subscriptions for this user
        const subscriptions = await Subscription.find({ userId });

        // Filter out invalid subscriptions
        const validSubscriptions = subscriptions.filter((sub) =>
            isValidSubscription({
                endpoint: sub.endpoint,
                keys: sub.keys,
            }),
        );

        if (validSubscriptions.length === 0) {
            return res.status(404).json({ message: "No valid subscriptions found" });
        }

        // Send notification to each valid subscription
        const sendPromises = validSubscriptions.map((sub) =>
            webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: sub.keys,
                },
                JSON.stringify({ title, body }),
            ),
        );

        await Promise.all(sendPromises);

        res.status(200).json({
            message: "Notifications sent",
            sentCount: validSubscriptions.length,
        });
    } catch (error) {
        console.error("Notification send error:", error);
        res.status(500).json({
            error: "Failed to send notifications",
            details: error.message,
        });
    }
});
module.exports = router;
