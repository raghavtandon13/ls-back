const User = require("../models/user.model");

async function createUser(mobileNo) {
    let user;
    try {
        user = await User.findOne({ phone: mobileNo });
        if (!user) {
            console.log("creating");
            const newUser = new User({ phone: mobileNo });
            user = await newUser.save();
            console.log("User created successfully:", user);
        }
    } catch (mongoError) {
        console.error("MongoDB error:", mongoError);
    }

    if (!user.accounts) {
        console.log("Initializing accounts array...");
        user.accounts = [];
        await user.save();
    }
    return user;
}

async function addToUser(user, data) {
    console.log("data: ", data);
    const AccountData = {
        ...data,
    };

    const AccountIndex = user.accounts.findIndex((account) => account.name === data.name);
    if (AccountIndex !== -1) {
        user.accounts[AccountIndex] = AccountData;
        console.log("found index", AccountIndex);
    } else {
        user.accounts.push(AccountData);
        console.log("pushing...");
    }
    await user.save();
}
async function updateUser(user, data) {
    const AccountData = {
        ...data,
    };

    const AccountIndex = user.accounts.findIndex((account) => account.name === data.name);
    if (AccountIndex !== -1) {
        const existingAccount = user.accounts[AccountIndex];
        user.accounts[AccountIndex] = {
            ...existingAccount,
            ...AccountData,
        };
        console.log("found index", AccountIndex);
    } else {
        user.accounts.push(AccountData);
        console.log("pushing...");
    }
    await user.save();
}

module.exports = { createUser, addToUser, updateUser };
