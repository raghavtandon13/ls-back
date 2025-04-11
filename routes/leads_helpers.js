// IMPORTS and CONSTANTS
const axios = require("axios");
const User = require("../models/user.model");
const filterLenders = require("../utils/lenderlist.util");
const fs = require("fs");
require("dotenv").config();
const LOGGING_ENABLED = process.env.LOGGING_ENABLED === "true";
const LEADS_BASE_URL = "https://credmantra.com";
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
        return res.status(403).json({ error: "Unauthorized" });
    }
    req.partner = partner;
    next();
}

async function getLenders(lead) {
    const { dob, salary, pincode, phone } = lead;
    const filteredLenders = await filterLenders(dob, parseInt(salary), parseInt(pincode));
    const user = await User.findOne({ phone: phone });
    const usedLenders = user.accounts.map((account) => account.name);
    const availableLenders = ["Fibe", "MoneyView", "Cashe", "Payme", "LoanTap", "Upwards", "Prefr"];
    const eligibleLenders = availableLenders
        .filter((lender) => filteredLenders.includes(lender))
        .filter((lender) => !usedLenders.includes(lender));
    return eligibleLenders;
}

async function sendLeads(lenders, lead) {
    const promises = lenders.map((lender) => injectLead(lender, lead));
    const results = await Promise.allSettled(promises);
    const allRes = processResults(lenders, results);
    return allRes;
}

async function injectLead(lender, lead) {
    try {
        switch (lender) {
            case "Cashe":
                return await casheInject(lead);
            case "Faircent":
                return await faircentInject(lead);
            case "Fibe":
                return await fibeInject(lead);
            case "LendingKart":
                return await lendingKartInject(lead);
            case "LoanTap":
                return await loanTapInject(lead);
            case "MPocket":
                return await mpocketInject(lead);
            case "MoneyTap":
                return await moneytapInject(lead);
            case "MoneyView":
                return await moneyviewInject(lead);
            case "Payme":
                return await paymeInject(lead);
            case "Prefr":
                return await prefrInject(lead);
            case "RamFin":
                return await ramInject(lead);
            case "SmartCoin":
                return await smartcoinInject(lead);
            case "Upwards":
                return await upwardsInject(lead);
            case "Upwards2":
                return await upwards2Inject(lead);
            case "Zype":
                return await zypeInject(lead);
        }
    } catch (error) {
        console.error(`Error injecting lead for ${lender}:`, error);
        return { status: "rejected", reason: error.message };
    }
}

function processResults(lenders, results) {
    const allRes = {};
    lenders.forEach((lender, index) => {
        const result = results[index];
        allRes[lender.toLowerCase()] = result.status === "fulfilled" ? result.value : `Error: ${result.reason.message}`;
    });
    return allRes;
}

async function addtoDB(lead, leadSender) {
    let user = await User.findOne({ phone: lead.phone });
    if (!user) {
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
            partner: leadSender || "Unknown",
            partnerSent: false,
            consent: lead.consent || formatDateTime(new Date()),
        });
        user = await newUser.save();
    } else {
        user.name = lead.firstName + " " + lead.lastName;
        user.phone = lead.phone;
        user.dob = lead.dob;
        user.email = lead.email;
        user.gender = lead.gender;
        user.city = lead.city;
        user.state = lead.state;
        user.pincode = lead.pincode;
        user.pan = lead.pan;
        user.employment = lead.employment || "Salaried";
        user.company_name = lead.empName;
        user.income = lead.salary;
        user.partner = leadSender || "Unknown";
        user.partnerSent = false;
        user.consent = lead.consent || formatDateTime(new Date());

        await user.save();
    }
    return user;
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
        consentDatetime: lead.consent || formatDateTime(new Date()),
    };
    const apiUrl = `${LEADS_BASE_URL}/api/v1/partner-api/fibe`;
    // const apiUrl = `https://credmantra.com/api/v1/partner-api/fibe`;
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
        personalAddress: { pincode: lead.pincode.toString(), city: lead.city, state: lead.state },
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
    const apiUrl = `${LEADS_BASE_URL}/api/v1/partner-api/lendingkart/p/create-application`;
    const lkRes = await axios.post(apiUrl, lkReq);
    return lkRes.data;
}

async function upwardsInject(lead) {
    const apiUrl0 = `${LEADS_BASE_URL}/api/v1/partner-api/upwards/eligibility`;
    const apiUrl1 = `${LEADS_BASE_URL}/api/v1/partner-api/upwards/create`;
    const apiUrl2 = `${LEADS_BASE_URL}/api/v1/partner-api/upwards/complete`;
    const apiUrl3 = `${LEADS_BASE_URL}/api/v1/partner-api/upwards/decision`;

    if (lead.employment !== "Salaried") return "Ineligible (self-emp)";
    const upwardsDedupe = {
        mobile_number: lead.phone.toString(),
        social_email_id: lead.email,
        pan: lead.pan,
    };
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
    const apiUrl1 = `${LEADS_BASE_URL}/api/v1/partner-api/upwards2/create`;
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
        consent_datetime: lead.consent || new Date().toISOString(),
    };
    const salaried = {
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
    const casheDeReq = {
        partner_name: "CredMantra_Partner1",
        mobile_no: lead.phone.toString(),
        email_id: lead.email,
    };
    const deDupeUrl = `${LEADS_BASE_URL}/api/v1/partner-api/cashe/checkDuplicateLead`;
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

        const apiUrl = `${LEADS_BASE_URL}/api/v1/partner-api/cashe/preApproval`;
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
            const createUrl = `${LEADS_BASE_URL}/api/v1/partner-api/cashe/createCustomer`;
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

    const dedupeUrl = `${LEADS_BASE_URL}/api/v1/partner-api/faircent/dedupe`;
    const apiUrl = `${LEADS_BASE_URL}/api/v1/partner-api/faircent/register`;
    const fcdedupeRes = await axios.post(dedupeUrl, fcdedupeReq);
    if (fcdedupeRes.data.result.message === "No Duplicate Record Found.") {
        const faircentRes = await axios.post(apiUrl, faircentReq);
        return faircentRes.data;
    } else {
        return "Duplicate";
    }
}

async function moneytapInject(lead) {
    try {
        const moneytapReq = {
            emailId: lead.email,
            phone: lead.phone,
            name: lead.firstName + " " + lead.lastName,
            panNumber: lead.pan,
            dateOfBirth: lead.dob,
            gender: lead.gender ? lead.gender.toUpperCase() : "MALE",
            jobType: lead.employment === "Salaried" ? "SALARIED" : "SELF_EMPLOYED",
            homeAddress: {
                addressLine1: "address line 1",
                addressLine2: "address line 2",
                city: lead.city ? lead.city[0].toUpperCase() + lead.city.slice(1) : "",
                state: lead.state ? lead.state[0].toUpperCase() + lead.state.slice(1) : "",
                pincode: lead.pincode || "",
            },
            companyName: lead.company_name || "",
            officeEmail: lead.email || "",
            incomeInfo: { declared: lead.income || 30000, mode: "ONLINE" },
        };
        const apiUrl = `${LEADS_BASE_URL}/api/v1/partner-api/moneytap/moneytap/create`;
        const moneytapRes = await axios.post(apiUrl, moneytapReq);
        return moneytapRes.data;
    } catch (error) {
        console.error("Error in moneytapInject:", error);
        if (error.response) return error?.response?.data;
        else return error?.message?.error?.error;
    }
}

async function prefrInject(lead) {
    const prefrDedupeReq = {
        mobileNumber: lead.phone.toString(),
        panNumber: lead.pan,
        personalEmailId: lead.email,
        productName: "pl",
        requestId: lead.id, // TODO: add id
    };
    const prefrdedupeUrl = `${LEADS_BASE_URL}/api/v1/partner-api/prefr/dedupe`;
    const prefrStartUrl = `${LEADS_BASE_URL}/api/v1/partner-api/prefr/start2`;
    const prefrDetailsUrl = `${LEADS_BASE_URL}/api/v1/partner-api/prefr/details`;
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
        addressList: [{ pincode: lead.pincode, residenceType: "rented", addressType: "current" }],
        declaredIncome: parseInt(lead.salary),
        employmentType: lead.employment || "salaried",
        incomeMode: "online",
        emailList: [{ email: lead.email, type: "primary_device" }],
    };
    const apiUrl1 = `${LEADS_BASE_URL}/api/v1/partner-api/moneyview/create`;
    const apiUrl2 = `${LEADS_BASE_URL}/api/v1/partner-api/moneyview/offers`;
    const apiUrl3 = `${LEADS_BASE_URL}/api/v1/partner-api/moneyview/journey`;

    const mvRes = await axios.post(apiUrl1, mvReq);
    if (mvRes.data.status !== "success") return mvRes.data.message;
    const mvRes2 = await axios.post(apiUrl2, { leadId: mvRes.data.leadId, phone: mvReq.phone });
    if (mvRes2.data.status !== "success") return mvRes2.data.message;
    const mvRes3 = await axios.post(apiUrl3, { leadId: mvRes.data.leadId, phone: mvReq.phone });
    if (mvRes3.data.status !== "success") return mvRes3.data.message;
    return mvRes3.data;
}

async function paymeInject(lead) {
    const apiUrl1 = `${LEADS_BASE_URL}/api/v1/partner-api/payme/dedupe`;
    const apiUrl2 = `${LEADS_BASE_URL}/api/v1/partner-api/payme/register`;
    const apiUrl3 = `${LEADS_BASE_URL}/api/v1/partner-api/payme/cibil`;
    const apiUrl4 = `${LEADS_BASE_URL}/api/v1/partner-api/payme/limit`;

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
    return { cibil: p3, limit: p4.data };
}

async function loanTapInject(lead) {
    console.log("lead: \n", lead);
    try {
        const loanTapReq = {
            add_application: {
                full_name: lead.firstName + " " + lead.lastName,
                personal_email: lead.email,
                mobile_number: lead.phone,
                job_type: "salaried",
                pan_card: lead.pan,
                dob: lead.dob,
                home_zipcode: lead.pincode,
                fixed_income: lead.salary || "30000",
                loan_city: lead.city || "Bangalore",
                consent_given: "yes",
                consent_given_timestamp: lead.consent || new Date().toISOString().slice(0, 10),
            },
        };
        console.log(loanTapReq);
        const apiUrl = `${LEADS_BASE_URL}/api/v1/partner-api/loantap`;
        const loanTapRes = await axios.post(apiUrl, loanTapReq);
        console.log(loanTapRes.data);
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

    const dedupeReq = { mobileNumber: lead.phone, email: lead.email };
    const dedupeRes = await axios.post(dedupeURL, dedupeReq);
    console.log(dedupeRes.data);
    if (
        ["User Profile Rejected on System", "User Profile Rejected on System", "User Not Eligible for Loan"].includes(
            dedupeRes.data.message,
        )
    ) {
        return dedupeRes.data;
    }

    const leadReq = {
        email_id: lead.email,
        mobile_no: lead.phone,
        full_name: lead.firstName + " " + lead.lastName,
        date_of_birth: lead.dob,
        gender: lead.gender.toLowerCase(),
        profession: "salaried",
    };
    const leadRes = await axios.post(leadURL, leadReq);
    return leadRes.data;

    // const statusReq = { request_id: leadRes.data.data.request_id };
    // const statusRes = await axios.post(statusURL, statusReq);
    // return statusRes.data.data;
}

async function zypeInject(lead) {
    try {
        const zypeDedupeURL = `${LEADS_BASE_URL}/api/v1/partner-api/zype/dedupe`;
        const zypeOfferURL = `${LEADS_BASE_URL}/api/v1/partner-api/zype/offer`;

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
    } catch (error) {
        return error.message || error.response.data || "Internal Server Error";
    }
}

async function ramInject(lead) {
    const ramUrl = `${LEADS_BASE_URL}/api/v1/partner-api/ram/create`;
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
    console.log(ramRes.data);
    return ramRes.data;
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

async function smartcoinInject(lead) {
    try {
        const smDedupeURL = "https://credmantra.com/api/v1/partner-api/smartcoin/smartcoin/dedupe";
        const smCreateURL = "https://credmantra.com/api/v1/partner-api/smartcoin/smartcoin/create";

        const smDedupeReq = {
            phone_number: lead.phone,
            pan: lead.pan,
            employement_type: "SALARIED",
            net_monthly_income: lead.income || "30000",
            date_of_birth: lead.dob || "",
            name_as_per_PAN: lead.name || "",
        };
        const smDedupeRes = await axios.post(smDedupeURL, smDedupeReq);
        console.log(smDedupeRes.data);

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
            console.log(smCreateRes.data);
            return smCreateRes.data;
        }

        return smDedupeRes.data;
    } catch (error) {
        console.log(error);
        return error.response.data;
    }
}

function logToFile(message) {
    const currentDate = new Date().toISOString().slice(0, 10);
    const currentTime = new Date().toLocaleTimeString();
    const logMessage = `${currentDate} ${currentTime}: ${JSON.stringify(message)}\n`;
    console.log(logMessage);
    if (!LOGGING_ENABLED) return;
    fs.appendFileSync("leads-logfile.txt", logMessage, (err) => {
        if (err) {
            console.error("Error writing to log file:", err);
        }
    });
}

module.exports = { addtoDB, checkLeadAuth, getLenders, logToFile, sendLeads };
