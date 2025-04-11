const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

async function lookup() {
    const pipeline = [
        { $match: { partner: "MoneyTap" } },
        {
            $lookup: {
                from: "Newtest",
                let: { userPincode: { $toInt: "$pincode" } },
                pipeline: [{ $match: { $expr: { $eq: ["$Jai", "$$userPincode"] } } }],
                as: "pincodeInfo",
            },
        },
        { $addFields: { serviceable: { $arrayElemAt: ["$pincodeInfo.Servicable", 0] } } },
        { $project: { pincodeInfo: 0 } },
        { $limit: 5 },
    ];

    const result = await User.aggregate(pipeline);
    console.log(result);
}

lookup();
