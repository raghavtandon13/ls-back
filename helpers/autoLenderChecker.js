const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();

async function main() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        mongoose.set("strictQuery", false);
        mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

        // const count1 = await User.countDocuments({
        //     partner: "MoneyTap",
        //     accounts: { $elemMatch: { name: "Cashe" } },
        // });
        // console.log("total: ", count1);
        //
        // const user1 = await User.find({
        //     partner: "MoneyTap",
        //     partnerSent: true,
        //     accounts: { $elemMatch: { name: "Cashe" } },
        // }).limit(1);
        // console.log("user: ", user1);
        //
        // const userAccounts = getUserAccounts(user1[0]);
        // console.log("User accounts:", userAccounts);

        const hello = await usedLenderList(6395988727);
        console.log(hello);
        process.exit(1);
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}
async function usedLenderList(phone) {
    const user = await User.findOne({ phone: phone });
    const userAccounts = user.accounts.map((account) => account.name);
    return userAccounts;
}
function getUserAccounts(user) {
    const userAccounts = user.accounts.map((account) => account.name);
    return userAccounts;
}
main();
