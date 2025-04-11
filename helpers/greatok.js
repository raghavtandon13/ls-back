const counts = await User.aggregate([
    // Match documents with accounts within the desired date range
    {
        $match: {
            accounts: {
                $elemMatch: {
                    $or: [
                        { "res.responseDate": { $gte: startDate, $lte: endDate } },
                        { resp_date: { $gte: startDate, $lte: endDate } },
                    ],
                },
            },
        },
    },
    // Unwind the accounts array to process each account individually
    { $unwind: "$accounts" },
    // Filter accounts to include only those within the desired date range
    {
        $match: {
            $or: [
                { "accounts.res.responseDate": { $gte: startDate, $lte: endDate } },
                { "accounts.resp_date": { $gte: startDate, $lte: endDate } },
            ],
        },
    },
    // Project only the required fields and compute the status
    {
        $project: {
            lender: "$accounts.name",
            status: {
                $switch: {
                    branches: [
                        // ===============================
                        // FIBE CONDITIONS
                        // ===============================
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Fibe"] },
                                    { $eq: ["$$account.res.reason", "customer lead created"] },
                                    fibedateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Fibe"] },
                                    { $eq: ["$$account.res.reason", "customer lead updated"] },
                                    fibedateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Fibe"] },
                                    {
                                        $regexMatch: {
                                            input: "$$account.res.reason",
                                            regex: /(salary|pincode|Pan|Age|Invalid)/i,
                                        },
                                    },
                                    fibedateRangeCondition,
                                ],
                            },
                            then: "Rejected",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Fibe"] },
                                    { $eq: ["$$account.res.reason", "customer already exists"] },
                                    fibedateRangeCondition,
                                ],
                            },
                            then: "Deduped",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Fibe"] },
                                    { $eq: ["$$account.res.reason", "Duplicate request"] },
                                    fibedateRangeCondition,
                                ],
                            },
                            then: "Deduped",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Fibe"] },
                                    { $ne: ["$$account.res.errorMessage", null] },
                                    fibedateRangeCondition,
                                ],
                            },
                            then: "Errors",
                        },
                        // ===============================
                        // RAMFIN CONDITIONS
                        // ===============================
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "RamFin"] },
                                    { $eq: ["$$account.msg", "Lead created successfully."] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "RamFin"] },
                                    { $eq: ["$$account.res.message", "Lead created successfully."] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "RamFin"] },
                                    { $eq: ["$$account.status", "Ineligible"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Rejected",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "RamFin"] },
                                    { $eq: ["$$account.status", "Dedupe"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Deduped",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "RamFin"] },
                                    { $ne: ["$$account.lead_status", null] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        // ===============================
                        // FATAKPAY CONDITIONS
                        // ===============================
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "FatakPay"] },
                                    { $eq: ["$$account.status", "Eligible"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "FatakPay"] },
                                    { $eq: ["$$account.status", "Ineligible"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Rejected",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "FatakPay"] },
                                    { $eq: ["$$account.status", "Deduped"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Deduped",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "FatakPay"] },
                                    { $ne: ["$$account.stage_name", null] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        // ===============================
                        // SMARTCOIN CONDITIONS
                        // ===============================

                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "SmartCoin"] },
                                    { $eq: ["$$account.isDuplicateLead", "true"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Deduped",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "SmartCoin"] },
                                    { $eq: ["$$account.isDuplicateLead", "false"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "SmartCoin"] },
                                    { $eq: ["$$account.message", "Lead created successfully"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "SmartCoin"] },
                                    {
                                        $regexMatch: {
                                            input: "$$account.message",
                                            regex: /(mandatory)/i,
                                        },
                                    },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Errors",
                        },
                        // ===============================
                        // ZYPE CONDITIONS
                        // ===============================
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Zype"] },
                                    { $eq: ["$$account.status", "ACCEPT"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Zype"] },
                                    { $eq: ["$$account.message", "REJECT"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Rejected",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Zype"] },
                                    { $eq: ["$$account.status", "REJECT"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Rejected",
                        },
                        // ===============================
                        // CASHE CONDITIONS
                        // ===============================
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Cashe"] },
                                    { $eq: ["$$account.status", "pre_approved"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Cashe"] },
                                    { $eq: ["$$account.status", "pre_qualified_low"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Cashe"] },
                                    { $eq: ["$$account.status", "rejected"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Rejected",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Cashe"] },
                                    {
                                        $regexMatch: {
                                            input: "$$account.res.status",
                                            regex: /(ERROR)/i,
                                        },
                                    },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Erros",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Cashe"] },
                                    { $eq: ["$$account.res.payload.status", "rejected"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Rejected",
                        },
                        // ===============================
                        // MPOCKET CONDITIONS
                        // ===============================
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Mpocket"] },
                                    { $eq: ["$$account.message", "User Eligible for Loan"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Mpocket"] },
                                    { $eq: ["$$account.message", "New User"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Mpocket"] },
                                    { $eq: ["$$account.message", "Data Accepted Successfully"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Mpocket"] },
                                    { $eq: ["$$account.message", "User Profile Rejected on System"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Rejected",
                        },

                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Mpocket"] },
                                    { $eq: ["$$account.message", "User Not Eligible for Loan"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Rejected",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "Mpocket"] },
                                    {
                                        $or: [{ $eq: ["$$account.message", null] }, { $not: ["$$account.message"] }],
                                    },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Rejected",
                        },
                        // ===============================
                        // MONEYVIEW CONDITIONS
                        // ===============================
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "MoneyView"] },
                                    {
                                        $or: [{ $eq: ["$$account.message", null] }, { $not: ["$$account.message"] }],
                                    },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Rejected",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "MoneyView"] },
                                    { $eq: ["$$account.message", "Lead has been rejected."] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Rejected",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "MoneyView"] },
                                    { $regexMatch: { input: "$$account.message", regex: /(nvalid)/i } },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Erros",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "MoneyView"] },
                                    { $eq: ["$$account.message", "Lead has been expired."] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Rejected",
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ["$$account.name", "MoneyView"] },
                                    { $eq: ["$$account.message", "success"] },
                                    dateRangeCondition,
                                ],
                            },
                            then: "Accepted",
                        },
                        // ===============================
                    ],
                    default: "Rest",
                },
            },
        },
    },
    // Group by lender and status to count occurrences
    {
        $group: {
            _id: { lender: "$lender", status: "$status" },
            count: { $sum: 1 },
        },
    },
    // Group again by lender to combine status counts
    {
        $group: {
            _id: "$_id.lender",
            counts: {
                $push: { status: "$_id.status", count: "$count" },
            },
        },
    },
    // Final projection to format the output
    {
        $project: {
            _id: 0,
            lender: "$_id",
            counts: 1,
        },
    },
]);
