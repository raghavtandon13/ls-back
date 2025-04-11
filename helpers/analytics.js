/*
 * ADD MORE LENDERS TO PIPELINE
 *
 * Step 1: Add a new [lender_name]_details field in addFieldsStage
 *         to fetch details from the accounts array.
 *
 * Step 2: Include [lender_name]_status, [lender_name]_loanAmount, and
 *         [lender_name]_id in addFields2Stage to extract specific lender information.
 *
 * Step 3: In project2Stage,add [lender_name]_details: 0 to remove
 *         [lender_name]_details to keep the output clean and focused.
 */

const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", true);
mongoose.connect(MONGODB_URI);

async function pipeline() {
    try {
        const matchStage = [
            {
                $match: {
                    createdAt: {
                        $gte: new Date("2024-05-01"),
                        $lt: new Date("2024-05-30"),
                    },
                    $expr: {
                        $and: [
                            {
                                $gte: [
                                    {
                                        $cond: {
                                            if: {
                                                $regexMatch: { input: "$income", regex: /^\d+(\.\d+)?$/ },
                                            },
                                            then: { $toDouble: "$income" },
                                            else: null,
                                        },
                                    },
                                    25000,
                                ],
                            },
                            {
                                $gte: [
                                    {
                                        $subtract: [
                                            { $year: "$$NOW" },
                                            { $year: { $dateFromString: { dateString: "$dob" } } },
                                        ],
                                    },
                                    25,
                                ],
                            },
                            {
                                $lte: [
                                    {
                                        $subtract: [
                                            { $year: "$$NOW" },
                                            { $year: { $dateFromString: { dateString: "$dob" } } },
                                        ],
                                    },
                                    50,
                                ],
                            },
                        ],
                    },
                },
            },
        ];

        const projectStage = [
            {
                $project: {
                    phone: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    pincode: 1,
                    partner: 1,
                    name: 1,
                    employment: 1,
                    accounts: 1,
                    income: 1,
                    dob: 1,
                    pan: 1,
                },
            },
        ];

        const addFieldsStage = [
            {
                $addFields: {
                    age: {
                        $floor: {
                            $divide: [{ $subtract: [new Date(), { $toDate: "$dob" }] }, 365.25 * 24 * 60 * 60 * 1000],
                        },
                    },
                    no_of_accounts: {
                        $cond: {
                            if: { $isArray: "$accounts" },
                            then: { $size: "$accounts" },
                            else: 0,
                        },
                    },
                    /* accounts_names: {
						$reduce: {
							input: "$accounts",
							initialValue: "",
							in: { $concat: [ "$$value", { $cond: [ { $eq: [ "$$value", "" ] }, "", " " ] }, "$$this.name" ] },
						},
					}, */
                    cashe_details: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$accounts",
                                    as: "account",
                                    cond: { $eq: ["$$account.name", "Cashe"] },
                                },
                            },
                            0,
                        ],
                    },
                    fibe_details: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$accounts",
                                    as: "account",
                                    cond: { $eq: ["$$account.name", "Fibe"] },
                                },
                            },
                            0,
                        ],
                    },
                    moneyview_details: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$accounts",
                                    as: "account",
                                    cond: {
                                        $eq: ["$$account.name", "MoneyView"],
                                    },
                                },
                            },
                            0,
                        ],
                    },
                    payme_details: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$accounts",
                                    as: "account",
                                    cond: { $eq: ["$$account.name", "Payme"] },
                                },
                            },
                            0,
                        ],
                    },
                    upwards_details: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$accounts",
                                    as: "account",
                                    cond: {
                                        $eq: ["$$account.name", "Upwards"],
                                    },
                                },
                            },
                            0,
                        ],
                    },
                    prefr_details: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$accounts",
                                    as: "account",
                                    cond: { $eq: ["$$account.name", "Prefr"] },
                                },
                            },
                            0,
                        ],
                    },
                    lk_details: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$accounts",
                                    as: "account",
                                    cond: {
                                        $eq: ["$$account.name", "LendingKart"],
                                    },
                                },
                            },
                            0,
                        ],
                    },
                    faircent_details: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$accounts",
                                    as: "account",
                                    cond: {
                                        $eq: ["$$account.name", "Faircent"],
                                    },
                                },
                            },
                            0,
                        ],
                    },
                    zype_details: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$accounts",
                                    as: "account",
                                    cond: { $eq: ["$$account.name", "Zype"] },
                                },
                            },
                            0,
                        ],
                    },
                    loantap_details: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$accounts",
                                    as: "account",
                                    cond: {
                                        $eq: ["$$account.name", "LoanTap"],
                                    },
                                },
                            },
                            0,
                        ],
                    },
                    um_details: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$accounts",
                                    as: "account",
                                    cond: {
                                        $eq: ["$$account.name", "Upwards MarketPlace"],
                                    },
                                },
                            },
                            0,
                        ],
                    },
                    mpocket_details: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$accounts",
                                    as: "account",
                                    cond: {
                                        $eq: ["$$account.name", "Mpocket"],
                                    },
                                },
                            },
                            0,
                        ],
                    },
                },
            },
        ];

        const addFields2Stage = [
            {
                $addFields: {
                    cashe_status: {
                        $cond: {
                            if: { $gt: ["$cashe_details.status", null] },
                            then: "$cashe_details.status",
                            else: "$$REMOVE",
                        },
                    },
                    cashe_id: {
                        $cond: {
                            if: { $gt: ["$cashe_details.id", null] },
                            then: "$cashe_details.id",
                            else: "$$REMOVE",
                        },
                    },
                    cashe_loanAmount: {
                        $cond: {
                            if: { $gt: ["$cashe_details.amount", null] },
                            then: "$cashe_details.amount",
                            else: "$$REMOVE",
                        },
                    },
                    fibe_status: {
                        $cond: {
                            if: { $gt: ["$fibe_details.status", null] },
                            then: "$fibe_details.status",
                            else: "$$REMOVE",
                        },
                    },
                    fibe_id: {
                        $cond: {
                            if: { $and: [{ $ne: ["$fibe_details.id", null] }, { $ne: ["$fibe_details.id", "null"] }] },
                            then: "$fibe_details.id",
                            else: "$$REMOVE",
                        },
                    },
                    fibe_loanAmount: {
                        $cond: {
                            if: {
                                $and: [
                                    { $ne: ["$fibe_details.loanAmount", 0] },
                                    { $gt: ["$fibe_details.loanAmount", null] },
                                ],
                            },
                            then: "$fibe_details.loanAmount",
                            else: "$$REMOVE",
                        },
                    },
                    payme_status: {
                        $cond: {
                            if: { $gt: ["$payme_details.msg", null] },
                            then: "$payme_details.msg",
                            else: "$$REMOVE",
                        },
                    },
                    payme_id: {
                        $cond: {
                            if: { $gt: ["$payme_details.user_id", null] },
                            then: "$payme_details.user_id",
                            else: "$$REMOVE",
                        },
                    },
                    payme_loanAmount: {
                        $cond: {
                            if: {
                                $and: [
                                    { $ne: [{ $arrayElemAt: ["$payme_details.limit.credit_limit", 0] }, 0] },
                                    { $gt: [{ $arrayElemAt: ["$payme_details.limit.credit_limit", 0] }, null] },
                                ],
                            },
                            then: { $arrayElemAt: ["$payme_details.limit.credit_limit", 0] },
                            else: "$$REMOVE",
                        },
                    },
                    moneyview_status: {
                        $cond: {
                            if: { $gt: ["$moneyview_details.message", null] },
                            then: "$moneyview_details.message",
                            else: "$$REMOVE",
                        },
                    },
                    moneyview_id: {
                        $cond: {
                            if: { $gt: ["$moneyview_details.id", null] },
                            then: "$moneyview_details.id",
                            else: "$$REMOVE",
                        },
                    },
                    moneyview_loanAmount: {
                        $cond: {
                            if: {
                                $and: [
                                    { $ne: [{ $arrayElemAt: ["$moneyview_details.offers.loanAmount", 0] }, 0] },
                                    { $gt: [{ $arrayElemAt: ["$moneyview_details.offers.loanAmount", 0] }, null] },
                                ],
                            },
                            then: { $arrayElemAt: ["$moneyview_details.offers.loanAmount", 0] },
                            else: "$$REMOVE",
                        },
                    },
                    upwards_status: {
                        $cond: {
                            if: { $gt: ["$upwards_details.status", null] },
                            then: "$upwards_details.status",
                            else: "$$REMOVE",
                        },
                    },
                    upwards_id: {
                        $cond: {
                            if: { $gt: ["$upwards_details.id", null] },
                            then: "$upwards_details.id",
                            else: "$$REMOVE",
                        },
                    },
                    prefr_status: {
                        $cond: {
                            if: { $gt: ["$prefr_details.response.eventName", null] },
                            then: "$prefr_details.response.eventName",
                            else: "$$REMOVE",
                        },
                    },
                    prefr_id: {
                        $cond: {
                            if: { $gt: ["$prefr_details.id", null] },
                            then: "$prefr_details.id",
                            else: "$$REMOVE",
                        },
                    },
                    lendingkart_status: {
                        $cond: {
                            if: { $gt: ["$lk_details.message", null] },
                            then: "$lk_details.message",
                            else: "$$REMOVE",
                        },
                    },
                    lendingkart_id: {
                        $cond: {
                            if: { $gt: ["$lk_details.leadId", null] },
                            then: "$lk_details.leadId",
                            else: "$$REMOVE",
                        },
                    },
                    faircent_status: {
                        $cond: {
                            if: { $gt: ["$faircent_details.status", null] },
                            then: "$faircent_details.status",
                            else: "$$REMOVE",
                        },
                    },
                    faircent_id: {
                        $cond: {
                            if: { $gt: ["$faircent_details.id", null] },
                            then: "$faircent_details.id",
                            else: "$$REMOVE",
                        },
                    },
                    faircent_loanAmount: {
                        $cond: {
                            if: {
                                $and: [
                                    { $ne: ["$faircent_details.res.result.offer_amount", 0] },
                                    { $gt: ["$faircent_details.res.result.offer_amount", null] },
                                ],
                            },
                            then: "$faircent_details.res.result.offer_amount",
                            else: "$$REMOVE",
                        },
                    },
                    zype_status: {
                        $cond: {
                            if: { $gt: ["$zype_details.status", null] },
                            then: "$zype_details.status",
                            else: "$$REMOVE",
                        },
                    },
                    zype_loanAmount: {
                        $cond: {
                            if: { $and: [{ $ne: ["$zype_details.offer", 0] }, { $gt: ["$zype_details.offer", null] }] },
                            then: "$zype_details.offer",
                            else: "$$REMOVE",
                        },
                    },
                    loantap_status: {
                        $cond: {
                            if: { $gt: ["$loantap_details.message", null] },
                            then: "$loantap_details.message",
                            else: "$$REMOVE",
                        },
                    },
                    loantap_id: {
                        $cond: {
                            if: { $gt: ["$loantap_details.data.lapp_id", null] },
                            then: "$loantap_details.data.lapp_id",
                            else: "$$REMOVE",
                        },
                    },
                    upwards_marketplace_status: {
                        $cond: {
                            if: { $ifNull: ["$um_details.data.is_success", null] },
                            then: { $cond: { if: "$um_details.data.is_success", then: "success", else: "failure" } },
                            else: "$$REMOVE",
                        },
                    },
                    upwards_marketplace_id: {
                        $cond: {
                            if: { $gt: ["$um_details.data.loan_data.customer_id", null] },
                            then: "$um_details.data.loan_data.customer_id",
                            else: "$$REMOVE",
                        },
                    },
                    mpocket_status: {
                        $cond: {
                            if: { $ifNull: ["$mpocket_details.success", null] },
                            then: { $cond: { if: "$mpocket_details.success", then: "success", else: "failure" } },
                            else: "$$REMOVE",
                        },
                    },
                    mpocket_id: {
                        $cond: {
                            if: { $gt: ["$mpocket_details.data.requestId", null] },
                            then: "$mpocket_details.data.requestId",
                            else: "$$REMOVE",
                        },
                    },
                },
            },
        ];

        const project2Stage = [
            {
                $project: {
                    _id: 0,
                    dob: 0,
                    accounts: 0,
                    cashe_details: 0,
                    fibe_details: 0,
                    payme_details: 0,
                    moneyview_details: 0,
                    upwards_details: 0,
                    prefr_details: 0,
                    lk_details: 0,
                    faircent_details: 0,
                    zype_details: 0,
                    loantap_details: 0,
                    um_details: 0,
                    mpocket_details: 0,
                },
            },
        ];

        const sortStage = [{ $sort: { accounts_size: -1, createdAt: -1 } }];

        const limitStage = [{ $limit: 1 }];

        const pipeline = [
            ...matchStage,
            ...projectStage,
            ...addFieldsStage,
            ...addFields2Stage,
            ...project2Stage,
            ...sortStage,
            ...limitStage,
        ];

        // console.log(JSON.stringify(pipeline));

        const result = await User.aggregate(pipeline);
        console.log(result);
        process.exit(0);
    } catch (error) {
        console.error("Error executing pipeline:", error);
        process.exit(1);
    }
}

pipeline();
