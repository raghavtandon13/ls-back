const { default: axios } = require("axios");
const CryptoJS = require("crypto-js");
const AES_BLOCK_SIZE = 32;
const key = "2f01fcf3c519f5930c0a38994554b79c"; //  FIX:
const iv = "9e718b7bf04758a1"; //  FIX:

function pad(inputString) {
    const padLen = AES_BLOCK_SIZE - (inputString.length % AES_BLOCK_SIZE);
    const padding = String.fromCharCode(padLen).repeat(padLen);
    return inputString + padding;
}

function unpad(inputString) {
    const padLen = inputString.charCodeAt(inputString.length - 1);
    return inputString.slice(0, -padLen);
}

function generateHash(inputString) {
    return CryptoJS.SHA256(inputString).toString(CryptoJS.enc.Hex);
}

function encryptAES(inputString, key, iv) {
    const paddedInput = pad(inputString);
    const encrypted = CryptoJS.AES.encrypt(paddedInput, CryptoJS.enc.Utf8.parse(key), {
        iv: CryptoJS.enc.Utf8.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.NoPadding, // We will handle padding ourselves
    });
    return encrypted.toString();
}

function decryptAES(inputString, key, iv) {
    const decrypted = CryptoJS.AES.decrypt(inputString, CryptoJS.enc.Utf8.parse(key), {
        iv: CryptoJS.enc.Utf8.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.NoPadding, // We will handle padding ourselves
    });
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    return unpad(decryptedString);
}

function generateEncryptedResponse(data, key, iv, applyHash = true) {
    if (typeof data === "object") {
        data = JSON.stringify(data);
    }
    const encryptedPayload = encryptAES(data, key, iv);
    let checksum = applyHash ? generateHash(encryptedPayload) : null;
    return {
        checksum: checksum,
        payload: encryptedPayload,
    };
}

plain = {
    payload: {
        basic_details: {
            mobile_number: "8779391212",
            email: "test@gmail.com",
            name: "Bhanupriya Bhatnagar",
            pan: "BCLPD9988G",
            date_of_birth: "15/10/1990",
        },
        address_details: {
            type: "COMMUNICATION",
            address_line: "charni Road",
            pincode: 400009,
            state_code: "MH",
        },
        professional_details: {
            occupation_type: "SALARIED",
            company_name: "COMPANY NAME",
            income: 30000,
        },
        loan_details: {
            amount: 10000,
            interest: {
                type: "FLAT",
                frequency: "MONTHLY",
                value: 3,
            },
            tenure: {
                type: "MONTHLY",
                value: 2,
            },
        },
        consent_data: {
            content: ["test content"],
            ip_address: "127.0.0.1",
            latitude: 18.52043,
            longitude: 19.52043,
            device_id: "23456789",
            consent_dtm: "2024-09-05 12:04:31.132 +0530",
        },
    },
    api_code: "CREATE_LEAD_API_V2",
};

plain2 = {
    payload: { lead_id: "L0603255861174" },
    api_code: "LEAD_STATUS_CHECK_API",
};

const encryptedResponse = generateEncryptedResponse(plain2, key, iv);

async function sendRequest() {
    const res = await axios.post("https://dev-tsp-los.lendenclub.com/v2/", encryptedResponse, {
        headers: { "Content-Type": "application/json", "partner-code": "CM" },
    });
    console.log(res.data);
    console.log("Decrypted Response:", JSON.parse(decryptAES(res.data.payload, key, iv)));
}

sendRequest();
