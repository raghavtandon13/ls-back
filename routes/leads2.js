// Imports
const express = require("express");
const axios = require("axios");
const router = express.Router();
const User = require("../models/user.model");
const filterLenders = require("../utils/lenderlist.util");
const fs = require("fs");

router.get("/", function (_req, res) {
    res.status(200).json({ type: "success", message: "leads service is running" });
});

let curPart = "";
const partnerApiKeys = {
    vs65Cu06K1GB2qSdJejP: "MoneyTap",
    vs65Cu06INTER1GB2qSdJejP: "DTMF",
    vs65Cu06INTER1GB2qxygeL: "Zype_LS",
};
function checkLeadAuth(req, res, next) {
    const authHeader = req.headers["x-api-key"];
    if (!authHeader) {
        return res.status(401).json({ error: "Authorization header is missing." });
    }
    const partner = partnerApiKeys[authHeader];
    if (!partner) {
        console.log("invalid header for inject1");
        return res.status(403).json({ error: "Unauthorized" });
    }
    console.log(partner);
    req.partner = partner;
    curPart = partner;
    next();
}

async function usedLenderList(phone) {
    const user = await User.findOne({ phone: phone });
    const userAccounts = user.accounts.map((account) => account.name);
    return userAccounts;
}

router.post("/inject", checkLeadAuth, async function (req, res) {
    const { lead } = req.body;
    try {
        const [dbPromise] = await Promise.allSettled([addtoDB(lead)]);
        const dbRes = dbPromise.status === "fulfilled" ? dbPromise.value : `Error: ${dbPromise.reason.message}`;
        const allRes = {  id: dbRes.user._id, status: dbRes.status };
        res.status(200).json(allRes);
    } catch (error) {
        console.error("Error during injection:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post("/inject2", async function (req, res) {
    const { lead } = req.body;
    if (lead === undefined || lead.dob === undefined || lead.salary === undefined || lead.pincode === undefined)
        return res.status(200).json({ status: "Insufficient Data" });

    const mainList = await filterLenders(lead.dob, parseInt(lead.salary), parseInt(lead.pincode));
    const availableLenders = ["Fibe", "MoneyView", "Cashe" /* "Payme", "LoanTap", "Upwards", "Prefr" */];
    const usedLender = await usedLenderList(lead.phone);

    let lenders = availableLenders
        .filter((lender) => mainList.includes(lender))
        .filter((lender) => !usedLender.includes(lender));

    // OVERRIDE
    lenders.push("Zype");
    lenders.push("LoanTap");
    lenders = ["Upwards2", "Zype", "MPocket"];
    if (lenders.length === 0) return res.status(200).json({ status: "Insufficient Data" });

    const lenderStop = req.headers["lenderstop"] === "true";
    if (lenderStop) {
        lenders = lenders.filter((lender) => lender !== "Cashe");
    }

    console.log(lead.phone, " lenders: ", lenders);

    const promises = [];
    if (lenders.includes("Cashe")) promises.push(casheInject(lead));
    if (lenders.includes("Faircent")) promises.push(faircentInject(lead));
    if (lenders.includes("Fibe")) promises.push(fibeInject(lead));
    if (lenders.includes("LendingKart")) promises.push(lendingKartInject(lead));
    if (lenders.includes("LoanTap")) promises.push(loanTapInject(lead));
    if (lenders.includes("MoneyTap")) promises.push(moneytapInject(lead));
    if (lenders.includes("MoneyView")) promises.push(moneyviewInject(lead));
    if (lenders.includes("MPocket")) promises.push(mpocketInject(lead));
    if (lenders.includes("Payme")) promises.push(paymeInject(lead));
    if (lenders.includes("Prefr")) promises.push(prefrInject(lead));
    if (lenders.includes("RamFincorp")) promises.push(ramInject(lead));
    if (lenders.includes("Upwards")) promises.push(upwardsInject(lead));
    if (lenders.includes("Upwards2")) promises.push(upwards2Inject(lead));
    if (lenders.includes("Zype")) promises.push(zypeInject(lead));
    if (lenders.includes("FatakPay")) promises.push(fatakPayInject(lead));

    try {
        const results = await Promise.allSettled(promises);

        const casheResult = lenders.includes("Cashe") ? results.shift() : null;
        const casheRes = casheResult
            ? casheResult.status === "fulfilled"
                ? casheResult.value
                : `Error: ${casheResult.reason.message}`
            : undefined;

        const faircentResult = lenders.includes("Faircent") ? results.shift() : null;
        const faircentRes = faircentResult
            ? faircentResult.status === "fulfilled"
                ? faircentResult.value
                : `Error: ${faircentResult.reason.message}`
            : undefined;

        const fibeResult = lenders.includes("Fibe") ? results.shift() : null;
        const fibeRes = fibeResult
            ? fibeResult.status === "fulfilled"
                ? fibeResult.value
                : `Error: ${fibeResult.reason.message}`
            : undefined;

        const lkResult = lenders.includes("LendingKart") ? results.shift() : null;
        const lkRes = lkResult
            ? lkResult.status === "fulfilled"
                ? lkResult.value
                : `Error: ${lkResult.reason.message}`
            : undefined;

        const loanTapResult = lenders.includes("LoanTap") ? results.shift() : null;
        const loanTapRes = loanTapResult
            ? loanTapResult.status === "fulfilled"
                ? loanTapResult.value
                : `Error: ${loanTapResult.reason.message}`
            : undefined;

        const mpocketResult = lenders.includes("MPocket") ? results.shift() : null;
        const mpocketRes = mpocketResult
            ? mpocketResult.status === "fulfilled"
                ? mpocketResult.value
                : `Error: ${mpocketResult.reason.message}`
            : undefined;

        const moneyTapResult = lenders.includes("MoneyTap") ? results.shift() : null;
        const moneyTapRes = moneyTapResult
            ? moneyTapResult.status === "fulfilled"
                ? moneyTapResult.value
                : `Error: ${moneyTapResult.reason.message}`
            : undefined;

        const mvResult = lenders.includes("MoneyView") ? results.shift() : null;
        const mvRes = mvResult
            ? mvResult.status === "fulfilled"
                ? mvResult.value
                : `Error: ${mvResult.reason.message}`
            : undefined;

        const pResult = lenders.includes("Payme") ? results.shift() : null;
        const pRes = pResult
            ? pResult.status === "fulfilled"
                ? pResult.value
                : `Error: ${pResult.reason.message}`
            : undefined;

        const prefrResult = lenders.includes("Prefr") ? results.shift() : null;
        const prefrRes = prefrResult
            ? prefrResult.status === "fulfilled"
                ? prefrResult.value
                : `Error: ${prefrResult.reason.message}`
            : undefined;

        const upwardsResult = lenders.includes("Upwards") ? results.shift() : null;
        const upwardsRes = upwardsResult
            ? upwardsResult.status === "fulfilled"
                ? upwardsResult.value
                : `Error: ${upwardsResult.reason.message}`
            : undefined;

        const upwards2Result = lenders.includes("Upwards2") ? results.shift() : null;
        const upwards2Res = upwards2Result
            ? upwards2Result.status === "fulfilled"
                ? upwards2Result.value
                : `Error: ${upwards2Result.reason.message}`
            : undefined;

        const zypeResult = lenders.includes("Zype") ? results.shift() : null;
        const zypeRes = zypeResult
            ? zypeResult.status === "fulfilled"
                ? zypeResult.value
                : `Error: ${zypeResult.reason.message}`
            : undefined;

        const ramResult = lenders.includes("RamFincorp") ? results.shift() : null;
        const ramRes = ramResult
            ? ramResult.status === "fulfilled"
                ? ramResult.value
                : `Error: ${ramResult.reason.message}`
            : undefined;

        const fatakResult = lenders.includes("FatakPay") ? results.shift() : null;
        const fatakRes = fatakResult
            ? fatakResult.status === "fulfilled"
                ? fatakResult.value
                : `Error: ${fatakResult.reason.message}`
            : undefined;

        const allRes = {
            cashe: casheRes,
            faircent: faircentRes,
            fibe: fibeRes,
            lendingKart: lkRes,
            loantap: loanTapRes,
            moneytap: moneyTapRes,
            moneyview: mvRes,
            mpokket: mpocketRes,
            payme: pRes,
            prefr: prefrRes,
            upwards: upwardsRes,
            upwards_marketplace: upwards2Res,
            zype: zypeRes,
            ramFin: ramRes,
            fatakPay: fatakRes,
        };

        logToFile(allRes);
        res.status(200).json(allRes);
    } catch (error) {
        console.error("Error during injection:", error);
        res.status(500).json({ error: error.message });
    }
});

async function addtoDB(lead) {
    let user = await User.findOne({ phone: lead.phone });
    let status = "";
    const d = formatDateTime(new Date());
    if (!user) {
        logToFile(`${d} NEW : ${lead.phone}`);
	status = "success";
        let newUser = new User({
            name: lead.firstName + " " + lead.lastName,
            phone: lead.phone,
            dob: lead.dob,
            email: lead.email,
            gender: lead.gender,
            city: lead.city,
            state: lead.state,
            pincode: lead.pincode,
            pan: lead.pan,
            employment: lead.employment || "Salaried",
            company_name: lead.empName,
            income: lead.salary,
            partner: curPart,
            partnerSent: false,
            consent: lead.consent || "",
        });
        newUser.partnerHistory.push({
            name: curPart,
            date: new Date(),
            type: "new",
        });
        user = await newUser.save();
    } else {
        logToFile(`${d} DEDUPE : ${lead.phone}`);
	status = "dedupe";
        user.name = lead.firstName && lead.lastName ? `${lead.firstName} ${lead.lastName}` : user.name;
        user.phone = lead.phone || user.phone;
        user.dob = lead.dob || user.dob;
        user.email = lead.email || user.email;
        user.gender = lead.gender || user.gender;
        user.city = lead.city || user.city;
        user.state = lead.state || user.state;
        user.pincode = lead.pincode || user.pincode;
        user.employment = lead.employment || user.employment || "Salaried";
        user.pan = lead.pan || user.pan;
        user.company_name = lead.empName || user.company_name;
        user.income = lead.salary || user.income;
        user.partnerSent = false;

        user.partnerHistory.push({
            name: curPart,
            date: new Date(),
            type: "dedupe",
        });

        await user.save();
    }
    return { user:user, status:status };
}

async function fibeInject(lead) {
    const fibeReq = {
        mobilenumber: lead.phone || "",
        profile: {
            firstname: lead.firstName || "",
            lastname: lead.lastName || "",
            dob: lead.dob,
            profession: "Salaried",
            address1: "",
            address2: "",
            landmark: "",
            city: lead.city || "",
            pincode: lead.pincode || "",
            maritalstatus: "",
        },
        finance: {
            pan: lead.pan ? lead.pan.toUpperCase() : "",
        },
        employeedetails: {
            employername: lead.empName || "",
            officeaddress: "",
            officeCity: "",
            officepincode: lead.pincode || "",
            salary: Math.ceil(lead.salary) || 21000,
        },
        consent: true,
        consentDatetime: lead.consent || "",
    };
    const apiUrl = "https://credmantra.com/api/v1/partner-api/fibe";
    const fibeRes = await axios.post(apiUrl, fibeReq);
    return fibeRes.data;
}

async function lendingKartInject(lead) {
    const lkReq = {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        mobile: lead.phone.toString(),
        personalDob: lead.dob,
        personalPAN: lead.pan.toUpperCase(),
        gender: lead.gender,
        personalAddress: {
            pincode: lead.pincode.toString(),
            city: lead.city,
            state: lead.state,
        },
        loanAmount: 200000,
        productType: "Personal Loan",
        uniqueId: "",
        cibilConsentForLK: true,
        otherFields: {
            consentTimestamp: "2024-03-09T06:57:32.000+00:00",
            employmentType: "FULL_TIME",
            monthlySalary: lead.salary || 30000,
            monthlyProfit: null,
            tenure: "18",
            itrFiled: false,
            maritalStatus: "SINGLE",
            companyName: lead.empName || "OTHERS",
            companyEmailId: lead.email,
        },
    };
    const apiUrl = "https://credmantra.com/api/v1/partner-api/lendingkart/p/create-application";
    const lkRes = await axios.post(apiUrl, lkReq);
    return lkRes.data;
}

async function upwardsInject(lead) {
    if (lead.employment !== "Salaried") return "Ineligible (self-emp)";
    const upwardsDedupe = {
        mobile_number: lead.phone.toString(),
        social_email_id: lead.email,
        pan: lead.pan,
    };
    const apiUrl0 = "https://credmantra.com/api/v1/partner-api/upwards/eligibility";
    try {
        const upwardsRes0 = await axios.post(apiUrl0, upwardsDedupe);
        if (upwardsRes0.data.is_eligible === false) {
            return "Duplicate";
        }
    } catch (error) {
        return error.data;
    }
    const upwardsReq = {
        first_name: lead.firstName,
        last_name: lead.lastName,
        pan: lead.pan,
        dob: lead.dob,
        gender: lead.gender.toLowerCase(),
        social_email_id: lead.email,
        mobile_number1: lead.phone.toString(),
        current_pincode: lead.pincode.toString(),
        current_city: lead.city,
        current_state: lead.state,
        company: lead.empName || "company",
        employment_status_id: 3,
        profession_type_id: 21,
        salary_payment_mode_id: 2,
        salary: parseInt(lead.salary),
        consent: true,
    };
    const apiUrl1 = "https://credmantra.com/api/v1/partner-api/upwards/create";
    const apiUrl2 = "https://credmantra.com/api/v1/partner-api/upwards/complete";
    const apiUrl3 = "https://credmantra.com/api/v1/partner-api/upwards/decision";

    try {
        const upwardsRes1 = await axios.post(apiUrl1, upwardsReq);
        if (upwardsRes1.data.data.loan_data.customer_id && upwardsRes1.data.data.loan_data.loan_id) {
            await axios.post(apiUrl2, {
                loan_id: upwardsRes1.data.data.loan_data.loan_id,
                customer_id: upwardsRes1.data.data.loan_data.customer_id,
            });
            const upwardsRes3 = await axios.post(apiUrl3, {
                loan_id: upwardsRes1.data.data.loan_data.loan_id,
                customer_id: upwardsRes1.data.data.loan_data.customer_id,
            });
            return upwardsRes3.data;
        }
        return upwardsRes1.data;
    } catch (error) {
        return error.data;
    }
}

async function upwards2Inject(lead) {
    const apiUrl1 = "http://localhost:3000/api/v1/partner-api/upwards2/create";
    const comman = {
        consent: true,
        current_city: lead.city,
        current_pincode: lead.pincode.toString(),
        current_state: lead.state,
        dob: lead.dob,
        employment_status_id: lead.employment === "Salaried" ? 3 : 2,
        first_name: lead.firstName,
        gender: lead.gender.toLowerCase(),
        last_name: lead.lastName,
        mobile_number1: lead.phone.toString(),
        pan: lead.pan,
        social_email_id: lead.email,
        consent_datetime: lead.consent || "",
    };
    const salaried = {
        // is_subvention_applicable: false
        // current_residence_type_id: 4,
        // interest_rate_per_tenure: 0.03,
        // sub_industry_type_id: 2,
        // transaction_mode_type_id: 2,
        application_journey_id: 4,
        company: lead.empName || "company",
        industry_type_id: 6,
        profession_type_id: 21,
        salary: parseInt(lead.salary),
        salary_payment_mode_id: 2,
    };
    const selfe = {
        business_owner_type_id: 2,
        business_type_id: 2,
        // business_start_date: "2022-10-01",
        annual_revenue: lead.salary * 12,
        application_journey_id: 5,
        establishment_name: lead.empName || "company",
    };
    let upwardsReq = {};
    if (lead.employment === "Salaried") {
        upwardsReq = { ...comman, ...salaried };
    } else {
        upwardsReq = { ...comman, ...selfe };
    }
    try {
        const upwardsRes1 = await axios.post(apiUrl1, upwardsReq);
        return upwardsRes1.data;
    } catch (error) {
        return error.data;
    }
}

async function casheInject(lead) {
    if (lead.employment === "Self-employed") {
        return "not eligible";
    }
    const casheDeReq = {
        partner_name: "CredMantra_Partner1",
        mobile_no: lead.phone.toString(),
        email_id: lead.email,
    };
    const deDupeUrl = "https://credmantra.com/api/v1/partner-api/cashe/checkDuplicateLead";
    const casheDeRes = await axios.post(deDupeUrl, casheDeReq);
    if (casheDeRes.data.payLoad === "NO") {
        const casheReq = {
            partner_name: "CredMantra_Partner1",
            pan: lead.pan,
            mobileNo: lead.phone,
            name: lead.firstName + " " + lead.lastName,
            addressLine1: "addressLine1",
            locality: "locality",
            pinCode: lead.pincode,
            gender: lead.gender[0].toUpperCase(),
            salary: lead.salary,
            state: lead.state.toUpperCase(),
            city: lead.city,
            dob: lead.dob + " 00:00:00",
            employmentType: 1,
            salaryReceivedType: 3,
            emailId: lead.email,
            companyName: lead.empName || "OTHERS",
            loanAmount: 200000,
        };

        const apiUrl = "https://credmantra.com/api/v1/partner-api/cashe/preApproval";
        const casheRes = await axios.post(apiUrl, casheReq);

        if (casheRes.data.message === "Success") {
            const casheCreateReq = {
                partner_name: "CredMantra_Partner1",
                "Personal Information": {
                    "First Name": lead.firstName,
                    Gender: lead.gender[0].toUpperCase() + lead.gender.slice(1).toLowerCase(),
                    "Address Line 1": casheReq.addressLine1,
                    Pincode: casheReq.pinCode,
                    City: casheReq.city,
                    State: casheReq.state,
                    PAN: casheReq.pan,
                },
                "Applicant Information": {
                    "Company Name": casheReq.companyName || "OTHERS",
                    "Monthly Income": casheReq.salary,
                    "Employment Type": "Salaried full-time",
                    SalaryReceivedTypeId: casheReq.salaryReceivedType,
                },
                "Contact Information": {
                    Mobile: casheReq.mobileNo,
                    "Email Id": casheReq.emailId,
                },
            };
            const createUrl = "https://credmantra.com/api/v1/partner-api/cashe/createCustomer";
            const casheCreateRes = await axios.post(createUrl, casheCreateReq);
            return casheCreateRes.data;
        }
        return casheRes.data.message;
    }
    return "Duplicate";
}

async function faircentInject(lead) {
    const fcdedupeReq = {
        mobile: lead.phone.toString(),
        email: lead.email,
        pan: lead.pan,
    };
    const faircentReq = {
        fname: lead.firstName,
        lname: lead.lastName,
        dob: lead.dob,
        pan: lead.pan,
        mobile: parseInt(lead.phone),
        pin: parseInt(lead.pincode),
        state: lead.state,
        city: lead.city,
        address: "address1",
        mail: lead.email,
        gender: lead.gender[0].toUpperCase(),
        employment_status: "Salaried",
        loan_purpose: 1365,
        loan_amount: 200000,
        monthly_income: lead.salary,
        consent: "Y",
        tnc_link: "https://www.faircent.in/terms-conditions",
        sign_ip: "3.27.146.211",
        sign_time: Math.floor(Date.now() / 1000),
    };

    const dedupeUrl = "https://credmantra.com/api/v1/partner-api/faircent/dedupe";
    const apiUrl = "https://credmantra.com/api/v1/partner-api/faircent/register";
    const fcdedupeRes = await axios.post(dedupeUrl, fcdedupeReq);
    if (fcdedupeRes.data.result.message === "No Duplicate Record Found.") {
        const faircentRes = await axios.post(apiUrl, faircentReq);
        return faircentRes.data;
    } else {
        return "Duplicate";
    }
}

async function moneytapInject(lead) {
    const moneytapReq = {
        emailId: lead.email ? lead.email : "",
        phone: lead.phone ? lead.phone : "",
        name: lead.name ? lead.name : "",
        panNumber: lead.pan ? lead.pan : "",
        dateOfBirth: lead.dob ? lead.dob : "",
        gender: lead.gender ? lead.gender.toUpperCase() : "MALE",
        jobType: lead.employment ? lead.employment.toUpperCase() : "SALARIED",
        homeAddress: {
            addressLine1: lead.addr ? lead.addr.split(" ")[0] : "address line 1",
            addressLine2: lead.addr ? lead.addr.split(" ")[1] : "address line 2",
            city: lead.city ? lead.city : "city",
            state: lead.state ? lead.state : "state",
            pincode: lead.pincode ? lead.pincode : "pincode",
        },
        incomeInfo: { declared: lead.income ? lead.income : 30000, mode: "online" },
    };
    const apiUrl = "https://credmantra.com/api/v1/partner-api/moneytap/moneytap/create";
    const moneytapRes = await axios.post(apiUrl, moneytapReq);
    return moneytapRes.data;
}

async function prefrInject(lead) {
    const prefrDedupeReq = {
        mobileNumber: lead.phone.toString(),
        panNumber: lead.pan,
        personalEmailId: lead.email,
        productName: "pl",
    };
    const prefrdedupeUrl = "http://localhost:3000/api/v1/partner-api/prefr/dedupe";
    const prefrStartUrl = "http://localhost:3000/api/v1/partner-api/prefr/start2";
    const prefrDetailsUrl = "http://localhost:3000/api/v1/partner-api/prefr/details";

    const prefrDedupeRes = await axios.post(prefrdedupeUrl, prefrDedupeReq);

    if (prefrDedupeRes.data.data.duplicateFound === false) {
        const prefrStartRes = await axios.post(prefrStartUrl, {
            mobileNo: lead.phone.toString(),
        });
        if (prefrStartRes.data.status === "success") {
            const prefrReq = {
                loanId: prefrStartRes.data.data.loanId,
                firstName: lead.firstName,
                lastName: lead.lastName,
                personalEmailId: lead.email,
                gender: lead.gender.charAt(0).toUpperCase() + lead.gender.slice(1).toLowerCase(),
                dob: lead.dob.split("-").reverse().join("/"),
                panNumber: lead.pan.toUpperCase(),
                employmentType: "salaried",
                desiredLoanAmount: 150000,
                netMonthlyIncome: parseInt(lead.salary),
                currentAddressPincode: lead.pincode.toString(),
                currentAddress: "address 1",
            };

            const prefrRes = await axios.post(prefrDetailsUrl, prefrReq);

            if (prefrRes.data.status === "failure") {
                return "Duplicate Customer";
            }
            return prefrRes.data.status;
        } else {
            return "Failed at Start";
        }
    } else {
        return "Duplicate";
    }
}

async function moneyviewInject(lead) {
    const mvReq = {
        name: lead.firstName + " " + lead.lastName,
        gender: lead.gender.toLowerCase(),
        phone: lead.phone.toString(),
        pan: lead.pan.toUpperCase(),
        dateOfBirth: lead.dob,
        bureauPermission: true,
        addressList: [
            {
                pincode: lead.pincode,
                residenceType: "rented",
                addressType: "current",
            },
        ],
        declaredIncome: parseInt(lead.salary),
        employment: !lead.employment
            ? "Salaried"
            : lead.employment === "Self-employed"
              ? "Self Employed"
              : lead.employment,
        incomeMode: "online",
        emailList: [
            {
                email: lead.email,
                type: "primary_device",
            },
        ],
    };
    const apiUrl1 = "https://credmantra.com/api/v1/partner-api/moneyview/create";
    const apiUrl2 = "https://credmantra.com/api/v1/partner-api/moneyview/offers";
    const apiUrl3 = "https://credmantra.com/api/v1/partner-api/moneyview/journey";

    const mvRes = await axios.post(apiUrl1, mvReq);
    if (mvRes.data.status !== "success") return mvRes.data.message;
    const mvRes2 = await axios.post(apiUrl2, {
        leadId: mvRes.data.leadId,
        phone: mvReq.phone,
    });
    if (mvRes2.data.status !== "success") return mvRes2.data.message;
    const mvRes3 = await axios.post(apiUrl3, {
        leadId: mvRes.data.leadId,
        phone: mvReq.phone,
    });
    if (mvRes3.data.status !== "success") return mvRes3.data.message;
    return mvRes3.data;
}

async function paymeInject(lead) {
    const apiUrl1 = "https://credmantra.com/api/v1/partner-api/payme/dedupe";
    const apiUrl2 = "https://credmantra.com/api/v1/partner-api/payme/register";
    const apiUrl3 = "https://credmantra.com/api/v1/partner-api/payme/cibil";
    const apiUrl4 = "https://credmantra.com/api/v1/partner-api/payme/limit";

    const p1Req = {
        pan_card_number: lead.pan,
        email: lead.email,
        phone_number: lead.phone,
    };
    const p1Res = await axios.post(apiUrl1, p1Req);
    if (p1Res.data.message !== "user_not_found") return p1Res.data.message;

    const p2Req = {
        email: lead.email,
        phone_number: lead.phone,
        full_name: lead.firstName + " " + lead.lastName,
    };
    const p2Res = await axios.post(apiUrl2, p2Req);
    if (p2Res.data.message !== "Signed-in Successfully") return p2Res.data.message;

    const pReq3 = {
        address: lead.city + " " + lead.state,
        dob: lead.dob,
        email: lead.email,
        first_name: lead.firstName,
        gender: lead.gender[0].toUpperCase() + lead.gender.slice(1).toLowerCase(),
        last_name: lead.lastName,
        pan_card_number: lead.pan,
        phone_number: lead.phone,
        pin_code: lead.pincode,
        token: p2Res.data.data.token,
    };

    let p3 = {};
    let p4 = {};

    let retries = 3;
    while (retries > 0) {
        try {
            const pRes3 = await axios.post(apiUrl3, pReq3);
            p3 = pRes3.data;
            break;
        } catch (error) {
            retries--;
            if (retries === 0) {
                return { error: "Max retries exceeded" };
            }
        }
    }

    try {
        const pRes4 = await axios.post(apiUrl4, {
            phone_number: pReq3.phone_number,
            token: p2Res.data.data.token,
        });
        p4 = pRes4.data;
    } catch (error) {
        console.error("Error in pRes4 request:", error);
    }

    return {
        cibil: p3,
        limit: p4.data,
    };
}

async function loantapInject(user) {
    const loantapReq = {
        add_application: {
            full_name: user.name,
            personal_email: user.email,
            mobile_number: user.phone,
            job_type: "salaried",
            pan_card: user.pan,
            dob: user.dob,
            home_zipcode: user.pincode,
            fixed_income: user.salary || "30000",
            loan_city: user.city || "Bangalore",
            consent_given: "yes",
            consent_given_timestamp: user.consent,
        },
    };
    // console.log(JSON.stringify(loantapReq));

    const response = await axios.post("https://credmantra.com/api/v1/partner-api/loantap", loantapReq, {
        headers: { "Content-Type": "application/json" },
    });

    return response.data;
}
async function loanTapInject2(lead) {
    console.log("lead: \n", lead);
    try {
        const comman = {
            full_name: lead.firstName + " " + lead.lastName,
            personal_email: lead.email,
            mobile_number: lead.phone,
            pan_card: lead.pan,
            dob: lead.dob,
            gender: lead.gender ? lead.gender[0].toUpperCase() + lead.gender.slice(1).toLowerCase() : "Male",
            marital_status: "single",
            job_type: lead.employment ? lead.employment.toLowerCase() : "self-employed",
            home_addr_line1: "addr line 1",
            home_addr_line2: "addr line 2",
            home_city: lead.city,
            home_zipcode: lead.pincode,
            req_amount: "200000",
        };
        let specfic = {};
        if (lead.employment === "Salaried") {
            specfic = {
                fixed_income: lead.income || "30000",
                employer_name: lead.empName || "COMPANY",
                office_addr_line1: "addr line 1",
                office_addr_line2: "addr line 2",
                office_city: lead.city,
                office_zipcode: lead.pincode,
            };
        } else {
            specfic = {
                business_ownership_type: "owned",
                business_name: lead.empName || "COMPANY",
                business_addr_line1: "addr line 1",
                business_addr_line2: "addr line 1",
                business_zipcode: lead.pincode,
                business_city: lead.pincode,
                business_monthly_sales: lead.income || "30000",
                loan_city: lead.city,
                req_tenure: 60,
            };
        }
        const loanTapReq = { add_application: { ...comman, ...specfic } };
        const apiUrl = "https://credmantra.com/api/v1/partner-api/loantap";
        const loanTapRes = await axios.post(apiUrl, loanTapReq);
        return (
            loanTapRes.data.add_application.answer || {
                code: loanTapRes.data.add_application.error.error_code,
                args: loanTapRes.data.add_application.error.errors,
            }
        );
    } catch (error) {
        console.log(error);
    }
}

async function mpocketInject(lead) {
    const dedupeURL = "http://13.201.83.62/api/v1/mpocket/dedupe";
    const leadURL = "http://13.201.83.62/api/v1/mpocket/lead";
    const statusURL = "http://13.201.83.62/api/v1/mpocket/status";

    const dedupeReq = { mobileNumber: lead.phone, email: lead.email };
    const dedupeRes = await axios.post(dedupeURL, dedupeReq);
    if (dedupeRes.data.message !== "New user") return "Duplicate";

    const leadReq = {
        email_id: lead.email,
        mobile_no: lead.phone,
        full_name: lead.firstName + " " + lead.lastName,
        date_of_birth: lead.dob,
        gender: lead.gender.toLowerCase(),
        profession: "salaried",
    };
    const leadRes = await axios.post(leadURL, leadReq);
    if (leadRes.data.message !== "Data has been accepted") return "Rejected";

    const statusReq = { request_id: leadRes.data.data.request_id };
    const statusRes = await axios.post(statusURL, statusReq);
    return statusRes.data.data; // [0]
}

async function zypeInject(lead) {
    const zypeDedupeURL = "http://localhost:3000/api/v1/partner-api/zype/dedupe";
    const zypeOfferURL = "http://localhost:3000/api/v1/partner-api/zype/offer";

    const zypeDedupeReq = { mobileNumber: lead.phone, panNumber: lead.pan };
    const zypeDedupeRes = await axios.post(zypeDedupeURL, zypeDedupeReq);

    if (zypeDedupeRes.data.status === "ACCEPT") {
        const zypeOfferReq = {
            mobileNumber: lead.phone,
            email: lead.email,
            panNumber: lead.pan,
            name: lead.firstName + " " + lead.lastName,
            dob: lead.dob,
            employmentType: "salaried",
            income: parseInt(lead.salary) || 30000,
            orgName: lead.empName || "COMPANY",
            bureauType: 3,
        };

        const zypeOfferRes = await axios.post(zypeOfferURL, zypeOfferReq);
        return zypeOfferRes.data;
    }

    return zypeDedupeRes.data;
}

async function ramInject(lead) {
    const ramUrl = "http://localhost:3000/api/v1/partner-api/ram/create";
    const ramUrl2 = "http://localhost:3000/api/v1/partner-api/ram/status";
    const ramReq = {
        name: lead.firstName + " " + lead.lastName,
        mobile: lead.phone,
        loanAmount: "100000",
        email: lead.email,
        employeeType: "Salered",
        dob: lead.dob,
        pancard: lead.pan,
    };
    const ramRes = await axios.post(ramUrl, ramReq);
    if (ramRes.data.status === 1) {
        const ramRes2 = await axios.post(ramUrl2, { mobile: lead.phone });
        return ramRes2.data;
    }
    return ramRes.data;
}

async function smartcoinInject(lead) {
    const smDedupeURL = "http://localhost:3000/api/v1/partner-api/smartcoin/smartcoin/dedup";
    const smCreateURL = "http://localhost:3000/api/v1/partner-api/smartcoin/smartcoin/create";

    const smDedupeReq = {
        phone_number: lead.phone,
        pan: lead.pan,
        employement_type: "SALARIED",
        net_monthly_income: lead.income || "30000",
        date_of_birth: lead.dob || "",
        name_as_per_PAN: lead.name || "",
    };
    const smDedupeRes = await axios.post(smDedupeURL, smDedupeReq);

    if (smDedupeRes.data.isDuplicateLead === "false") {
        const smOfferReq = {
            phone_number: lead.phone,
            pan: lead.pan,
            email: lead.email,
            loan_amount: "200000",
            loan_tenure: "12",
            employement_type: "SALARIED",
            net_monthly_income: lead.income || "30000",
            date_of_birth: lead.dob || "",
            name_as_per_PAN: lead.name || "",
        };

        const smCreateRes = await axios.post(smCreateURL, smOfferReq);
        return smCreateRes.data;
    }

    return smDedupeRes.data;
}

async function fatakPayInject(lead) {
    const fatakpayUrl = `${LEADS_BASE_URL}/api/v1/partner-api/fatakpay/eligibility`;

    const fatakpayReq = {
        mobile: parseInt(lead.phone),
        first_name: lead.firstName,
        last_name: lead.lastName,
        gender: lead.gender,
        email: lead.email,
        employment_type_id: "Salaried",
        pan: lead.pan,
        dob: lead.dob,
        pincode: parseInt(lead.pincode) || 110001,
        consent: true,
        consent_timestamp: lead.consent || new Date().toISOString(),
    };

    try {
        const fatakpayRes = await axios.post(fatakpayUrl, fatakpayReq);
        return fatakpayRes.data;
    } catch (error) {
        console.error(`Error processing lead ${lead.phone}:`, error);
        return null;
    }
}

function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function logToFile(message) {
    const currentDate = new Date().toISOString().slice(0, 10);
    const currentTime = new Date().toLocaleTimeString();
    const logMessage = `${currentDate} ${currentTime}: ${JSON.stringify(message)}\n`;
    fs.appendFile("leads-logfile.txt", logMessage, (err) => {
        if (err) {
            console.error("Error writing to log file:", err);
        }
    });
}

module.exports = router;
