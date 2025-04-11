const User = require("../models/user.model");
const LoanApplication = require("../models/accounts.model");
const mongoose = require("mongoose");
require("dotenv").config();

async function migrate() {
    const users = await User.find({ phone: "8094634634" });
    for (const user of users) {
        const loanApplications = [];
        for (const account of user.accounts) {
            const newLoanApp = new LoanApplication({
                user: user._id,
                phone: user.phone,
                lenderName: account.name,
                loanId: account.id || account.loanId,
                status: account.status,
                message: account.message || null,
                url: account.url || null,
                loanAmount: account.loanAmount || null,
                data: { ...account },
                createdAt: user.updatedAt,
            });
            await newLoanApp.save();
            console.log(newLoanApp);
            loanApplications.push(newLoanApp._id);
        }
        user.loanApplications = [...user.loanApplications, ...loanApplications];
        await user.save();
    }
    console.log("Migration completed successfully!");
    process.exit(0);
}

mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGODB_URI);
migrate().catch((err) => {
    console.error("Migration failed: ", err);
});
