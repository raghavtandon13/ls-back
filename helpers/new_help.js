const mongoose = require("mongoose");
const User = require("../models/user.model");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_URI);

async function getData(dates) {
    try {
        const start = dates.start;
        const end = dates.end;

        const pipeline = [];

        if (start && end) {
            pipeline.push({ $match: { updatedAt: { $gte: new Date(start), $lt: new Date(end) } } });
        }

        const uniqueAccountNames = await User.distinct("accounts.name");

        const facetStages = uniqueAccountNames.map((name) => ({
            [`count_${name}`]: [{ $match: { partnerSent: true, "accounts.name": name } }, { $count: "count" }],
        }));

        pipeline.push({
            $facet: {
                count1: [{ $match: { partnerSent: true } }, { $count: "count" }], //total sent
                count2: [{ $match: { partnerSent: false, partner: "MoneyTap" } }, { $count: "count" }], // not sent  yet
                ...facetStages.reduce((acc, stage) => ({ ...acc, ...stage }), {}),
            },
        });

        const result = await User.aggregate(pipeline).option({ maxTimeMS: 0, allowDiskUse: true });

        const formatNumber = (number) => {
            return new Intl.NumberFormat("en-IN").format(number);
        };

        const formattedResults = {
            "Total Pushed": formatNumber(result[0].count1[0] ? result[0].count1[0].count : 0),
            "Total Pending": formatNumber(result[0].count2[0] ? result[0].count2[0].count : 0),
        };

        uniqueAccountNames.forEach((name) => {
            formattedResults[name] = formatNumber(
                result[0][`count_${name}`][0] ? result[0][`count_${name}`][0].count : 0,
            );
        });

        formattedResults.active = {
            Cashe: false,
            Faircent: false,
            Fibe: true,
            LendingKart: false,
            LoanTap: false,
            MoneyView: true,
            Mpocket: true,
            Payme: false,
            Prefr: false,
            Upwards: false,
            "Upwards MarketPlace": true,
            Zype: true,
        };

        return formattedResults;
    } catch (error) {
        console.log("Error:", error);
        return { error: "Error Occurred" };
    }
}

async function getData2(dates) {
    const pipeline = [];
    const start = dates.start;
    const end = dates.end;
    if (start && end) {
        pipeline.push({ $match: { updatedAt: { $gte: new Date(start), $lt: new Date(end) } } });
    }
    pipeline.push(
        { $unwind: "$accounts" },
        {
            $group: {
                _id: {
                    name: "$accounts.name",
                    status: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$accounts.name", "Fibe"] }, then: "$accounts.status" },
                                { case: { $eq: ["$accounts.name", "MoneyView"] }, then: "$accounts.message" },
                            ],
                            default: "$accounts.status",
                        },
                    },
                },
                count: { $sum: 1 },
                firstDate: { $min: "$updatedAt" },
                lastDate: { $max: "$updatedAt" },
            },
        },
        {
            $group: {
                _id: "$_id.name",
                statusCounts: {
                    $push: {
                        k: { $ifNull: ["$_id.status", "null"] },
                        v: "$count",
                    },
                },
                total: { $sum: "$count" },
                firstDate: { $min: "$firstDate" },
                lastDate: { $max: "$lastDate" },
            },
        },
        {
            $project: {
                _id: 0,
                name: "$_id",
                statusCounts: { $arrayToObject: "$statusCounts" },
                total: 1,
                firstDate: { $dateToString: { format: "%Y-%m-%d", date: "$firstDate" } },
                lastDate: { $dateToString: { format: "%Y-%m-%d", date: "$lastDate" } },
            },
        },
    );
    const results = await User.aggregate(pipeline).option({ maxTimeMS: 0, allowDiskUse: true });
    const data = results.reduce((acc, result) => {
        acc[result.name] = {
            ...result.statusCounts,
            total: result.total,
            First: result.firstDate,
            Last: result.lastDate,
        };
        return acc;
    }, {});
    return reduceData(data);
}

function reduceData(data) {
    const reducedData = {};
    for (const [key, value] of Object.entries(data)) {
        if (key === "Fibe") {
            const rejected = value["null"] + value["Rejected"] + value["failure"] + value["error"];
            const accepted = value["Accepted"] + value["Suspended"] + value["success"];
            reducedData[key] = {
                Total: value.total,
                Accepted: accepted,
                Rejected: rejected,
                First: value.First,
                Last: value.Last,
            };
        } else {
            let accepted = 0;
            let rejected = 0;
            for (const [status, count] of Object.entries(value)) {
                if (status === "total" || status === "First" || status === "Last") continue;
                if (["success", "Accepted", "ACCEPT", "Approved", "pre_approved"].includes(status)) {
                    accepted += count;
                } else {
                    rejected += count;
                }
            }
            reducedData[key] = {
                First: value.First,
                Last: value.Last,
                Total: value.total,
                Accepted: accepted,
                Rejected: rejected,
            };
        }
    }
    return reducedData;
}

async function hello() {
    // const hello = await getData({ dates: { start: "2024-07-18", end: "2024-07-19" } });
    const hello = await getData2({ dates: { start: "2024-07-18", end: "2024-07-19" } });
    console.log(hello);
}
hello();
