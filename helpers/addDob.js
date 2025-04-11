const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

async function addDOB() {
  const results = [];

  fs.createReadStream("./new_zype_dob.csv").pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => { for (const entry of results) { const { phone, DOB } = entry; const [day, month, year] = DOB.split("/"); const dob = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`; try { const user = await User.findOne({ phone }); if (user) { user.dob = dob; await user.save(); console.log(`Updated DOB for phone: ${phone}`); } else { console.log(`User with phone ${phone} not found.`); } } catch (error) { console.error(`Error updating user with phone ${phone}:`, error); } } console.log("DOB update process completed."); mongoose.connection.close(); });
} addDOB();
