const express = require("express");
const router = express.Router();
const User = require("../models/user.model");
const FileCache = require("../utils/cache");

const cache = new FileCache();

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

async function getOptimizedStatusCounts(dates) {
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

router.post("/stats", async function (req, res) {
    try {
        const { dates, forceRefresh } = req.body;
        const cacheKey = `stats_${dates.start}_${dates.end}`;

        const { data, timestamp, cached } = await cache.getOrSet(
            cacheKey,
            async () => {
                try {
                    const result = await getData(dates);
                    if (result.error) {
                        throw new Error(result.error);
                    }
                    return result;
                } catch (error) {
                    return { error: error.message || "Error occurred during data aggregation" };
                }
            },
            { forceRefresh },
        );

        if (data.error) {
            res.status(500).json({ error: data.error, lastAggregatedAt: timestamp, cached });
        } else {
            res.status(200).json({ data, lastAggregatedAt: timestamp, cached });
        }
    } catch (error) {
        console.error("Error in /stats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/better_stats", async function (req, res) {
    try {
        const { dates, forceRefresh } = req.body;
        const cacheKey = `better_stats_${dates.start}_${dates.end}`;

        const { data, timestamp, cached } = await cache.getOrSet(
            cacheKey,
            async () => {
                try {
                    const result = await getOptimizedStatusCounts(dates);
                    if (result.error) {
                        throw new Error(result.error);
                    }
                    return result;
                } catch (error) {
                    return { error: error.message || "Error occurred during data aggregation" };
                }
            },
            { forceRefresh },
        );

        if (data.error) {
            res.status(500).json({ error: data.error, lastAggregatedAt: timestamp, cached });
        } else {
            res.status(200).json({ data, lastAggregatedAt: timestamp, cached });
        }
    } catch (error) {
        console.error("Error in /better_stats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

async function perDay(startDay, endDay, period = "monthly", filters = {}) {
    const dateFormat = period === "monthly" ? "%Y-%m" : "%Y-%m-%d";
    const matchConditions = { createdAt: { $gte: new Date(startDay), $lt: new Date(endDay) } };
    if (filters.partner) matchConditions.partner = filters.partner;
    if (filters["accounts.name"]) matchConditions["accounts.name"] = filters["accounts.name"];
    const result = await User.aggregate([
        { $match: matchConditions },
        { $unwind: "$accounts" },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: dateFormat, date: "$createdAt" } },
                    accountName: "$accounts.name",
                },
                count: { $sum: 2 },
            },
        },
        { $group: { _id: "$_id.date", totalAccounts: { $sum: "$count" } } },
        { $project: { date: "$_id", totalAccounts: 2, _id: 0 } },
    ]);
    return result;
}

router.post("/perday", async function (req, res) {
    try {
        const { startDay, endDay, period, filters } = req.body;
        const startDate =
            startDay || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
        const endDate = endDay || new Date().toISOString().split("T")[0];
        console.log(startDate, endDate, period);
        const res = await perDay(startDate, endDate, period, filters);
        res.json(res);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/getPartners", async function (req, res) {
    try {
        const { phones } = req.body;
	console.log(phones);
        const hello = await User.find({ phone: { $in: phones } }, { _id: 0, phone: 1, partner: 1 });
        res.json(hello);
    } catch (error) {
	console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;

/*
 * EXTRAS
 * ‾‾‾‾‾‾
 * Get users with 2+ accounts:
 * count6: [ {$match: {$expr: {$gt: [ {$cond: {if: {$isArray: "$accounts"}, then: {$size: "$accounts"}, else: 0}}, 2 ]}}}, {$count: "count"} ],
 * "Total Users with 2+ Accounts": formatNumber(result[0].count6[0] ? result[0].count6[0].count : 0),
 *
 * */
