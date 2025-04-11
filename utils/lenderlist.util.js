/********
 * ADD MORE LENDERS
 * Step 1: Create new entry in eligibleLenders. (Policy or No Policy)
 * Step 2: If pincode data is not available for the lender then create new entry in lenders_without_pincode_data.
 ********/

const fs = require("fs");
const path = require("path");

const eligibleLenders = [
    // Policy
    { name: "Cashe", minAge: 18, maxAge: 60, minSalary: 25000 },
    { name: "Faircent", minAge: 25, maxAge: 55, minSalary: 25000 },
    { name: "Fibe", minAge: 19, maxAge: 55, minSalary: 15000 },
    { name: "MoneyTap", minAge: 18, maxAge: 60, minSalary: 15000 },
    { name: "MoneyView", minAge: 18, maxAge: 60, minSalary: 15000 },
    { name: "Prefr", minAge: 22, maxAge: 55, minSalary: 15000 },
    { name: "Upwards", minAge: 21, maxAge: 55, minSalary: 35000 },
    { name: "Zype", minAge: 25, maxAge: 40, minSalary: 25000 },
    { name: "SmartCoin", minAge: 21, maxAge: 45, minSalary: 20000 },
    // No Policy
    { name: "LendingKart", minAge: 0, maxAge: 200, minSalary: 0 },
    { name: "MPocket", minAge: 0, maxAge: 200, minSalary: 0 },
    { name: "Upwards2", minAge: 0, maxAge: 200, minSalary: 0 },
    { name: "RamFin", minAge: 0, maxAge: 200, minSalary: 0 },
];
const lenders_without_pincode_data = [
    "LendingKart",
    "LoanTap",
    "MoneyTap",
    "MoneyView",
    "MPocket",
    "Upwards2",
    "AbhiLoans",
    "RamFin",
];

async function filterLenders(dob, income, pincode) {
    if (!dob || !income || !pincode) return [];

    const age = new Date().getFullYear() - new Date(dob.toString()).getFullYear();
    console.log(age, income, pincode);

    const filteredLenders = eligibleLenders.reduce((acc, lender) => {
        if (lender.minAge <= age && lender.maxAge >= age && lender.minSalary <= income) {
            acc.push(lender.name);
        }
        return acc;
    }, []);

    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "masterPolicy.json")));
    const pincodeLenders = Object.keys(data).filter((key) => data[key].includes(pincode));
    pincodeLenders.push(...lenders_without_pincode_data);

    return filteredLenders.filter((element) => pincodeLenders.includes(element));
}

module.exports = filterLenders;

// Small Test Case

/* async function test_case() {
    const test_result = await filterLenders("1988-12-12", 31000, 110001);
    console.log(test_result);
}
test_case(); */
