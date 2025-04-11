const fs = require("fs");
const Papa = require("papaparse");
const dayjs = require("dayjs");

// Read CSV file
const csvFilePath = "./mis credmantra 7 mar2.csv";
const csvData = fs.readFileSync(csvFilePath, "utf8");

// Parse CSV
const { data } = Papa.parse(csvData, { header: true, skipEmptyLines: true });

// Convert date columns and filter invalid dates
data.forEach((row) => {
    row.leads_date = dayjs(row.leads_date).isValid() ? dayjs(row.leads_date).format("YYYY-MM-DD") : null;
    row.approval_decision_date = dayjs(row.approval_decision_date).isValid()
        ? dayjs(row.approval_decision_date).format("YYYY-MM-DD")
        : null;
    row.disbursalDate = dayjs(row.disbursalDate).isValid() ? dayjs(row.disbursalDate).format("YYYY-MM-DD") : null;
});

// Remove rows where leads_date is null
const filteredData = data.filter((row) => row.leads_date);

// Group by leads_date
const summaryMap = {};
filteredData.forEach((row) => {
    const date = row.leads_date;
    if (!summaryMap[date]) {
        summaryMap[date] = { Lead_Count: 0, Approval_Count: 0, Disbursed_Counts: 0 };
    }
    summaryMap[date].Lead_Count++;
    if (row.approval_decision_date) summaryMap[date].Approval_Count++;
    if (row.disbursalDate) summaryMap[date].Disbursed_Counts++;
});

// Compute percentages and convert to array
const summary = Object.entries(summaryMap).map(([date, counts]) => ({
    Date: date,
    Lead_Count: counts.Lead_Count,
    Approval_Count: counts.Approval_Count,
    Approval_Count_Percentage: ((counts.Approval_Count / counts.Lead_Count) * 100).toFixed(2) || 0,
    Disbursed_Counts: counts.Disbursed_Counts,
    Disbursed_Count_Percentage: ((counts.Disbursed_Counts / counts.Approval_Count) * 100).toFixed(2) || 0,
}));

// Sort by date
summary.sort((a, b) => dayjs(a.Date).unix() - dayjs(b.Date).unix());

// Convert to CSV
const csvOutput = Papa.unparse(summary);
fs.writeFileSync("summary_report2.csv", csvOutput);

console.log("Summary report saved as summary_report.csv");
