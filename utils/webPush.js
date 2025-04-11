const webpush = require("web-push");
require("dotenv").config();

// Generate VAPID keys (do this once and save the keys)
const vapidKeys = webpush.generateVAPIDKeys();

// Configure web push with your VAPID keys
webpush.setVapidDetails(
    "mailto:your-service-email@example.com",
    process.env.VAPID_PUBLIC_KEY || vapidKeys.publicKey,
    process.env.VAPID_PRIVATE_KEY || vapidKeys.privateKey,
);

// Function to send notification to a specific subscription
const sendNotification = async (subscription, payload) => {
    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (error) {
        console.error("Error sending notification", error);
    }
};

module.exports = {
    webpush,
    sendNotification,
    vapidKeys,
};
