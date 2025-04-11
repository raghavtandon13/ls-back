// Load environment variables
require("dotenv").config();
const API_VERSION = process.env.API_VERSION;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware Setup
const cookieParser = require("cookie-parser");
const cors = require("cors");
const createError = require("http-errors");
const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");

// Initialize Express Application
const app = express();

// CORS Configuration
const allowlist = [
    "https://cred-db.vercel.app",
    "https://cred-front.vercel.app",
    "https://credmantra.com",
    "http://localhost:4200",
    "http://localhost:3000",
];

app.use(
    cors({
        origin: (origin, callback) => {
            const isAllowed = !origin || allowlist.includes(origin);
            callback(isAllowed ? null : new Error("Not allowed by CORS"), isAllowed);
        },
    }),
);

// Middleware
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
// const auth = require("./routes/auth");
// const crm = require("./routes/crm");
// const dsa = require("./routes/dsa");
// const googleAuth = require("./routes/google_auth");
const index = require("./routes/index");
const leads2 = require("./routes/leads_new"); // NEW
const leads = require("./routes/leads"); // OLD
const partnerApi = require("./routes/partner_api");
// const users = require("./routes/users");
// const situ = require("./routes/situ");
const upload = require("./routes/upload");
// const notifications = require("./routes/notifications");

app.use("/api" + API_VERSION + "/", index); // my chnage
// app.use("/api" + API_VERSION + "/auth", auth);
// app.use("/api" + API_VERSION + "/auth/google", googleAuth);
// app.use("/api" + API_VERSION + "/crm", crm);
// app.use("/api" + API_VERSION + "/dsa", dsa);
app.use("/api" + API_VERSION + "/leads", leads);
app.use("/api" + API_VERSION + "/leads2", leads2.router);
app.use("/api" + API_VERSION + "/partner-api", partnerApi);
// app.use("/api" + API_VERSION + "/users", users);
// app.use("/api" + API_VERSION + "/situ", situ);
app.use("/api" + API_VERSION + "/upload", upload);
// app.use("/api" + API_VERSION + "/notifications", notifications);

// Error Handling Middleware
app.use(function (_req, _res, next) {
    next(createError(404));
});

app.use(function (err, req, res, _next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};
    res.status(err.status || 500).send();
});


// MongoDB Connection
mongoose.set("strictQuery", false);

async function main() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Database connected");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port hahah ${PORT}`));
main();

module.exports = app;
