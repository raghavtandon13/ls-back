const crypto = require("crypto");
const axios = require("axios");

const AES_BLOCK_SIZE = 32;
const API_URL = "https://dev-tsp-los.lendenclub.com/v2/";
const KEY = "2f01fcf3c519f5930c0a38994554b79c";
const IV = "9e718b7bf04758a1";

const payload = {
    payload: {
        basic_details: {
            mobile_number: "8850689034",
            email: "test@gmail.com",
            name: "Bhanupriya Bhatnagar",
            pan: "BCLPD9988G",
            date_of_birth: "15/10/1990",
        },
        address_details: { type: "COMMUNICATION", address_line: "charni Road", pincode: 400009, state_code: "MH" },
        professional_details: { occupation_type: "SALARIED", company_name: "COMPANY NAME", income: 30000 },
        loan_details: {
            amount: 10000,
            interest: { type: "FLAT", frequency: "MONTHLY", value: 3 },
            tenure: { type: "MONTHLY", value: 2 },
        },
        consent_data: {
            content: ["hello"],
            ip_address: "127.0.0.1",
            latitude: 18.52043,
            longitude: 19.52043,
            device_id: "23456789",
            consent_dtm: "2024-09-05 12:04:31.132 +0530",
        },
    },
    api_code: "CREATE_LEAD_API_V2",
};

function pad(inputString) {
    const padLen = AES_BLOCK_SIZE - (inputString.length % AES_BLOCK_SIZE);
    return inputString + String.fromCharCode(padLen).repeat(padLen);
}

function unpad(inputString) {
    return inputString.slice(0, -inputString.charCodeAt(inputString.length - 1));
}

function encryptAES(plainText, key, iv) {
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key, "utf-8"), Buffer.from(iv, "utf-8"));
    let encrypted = cipher.update(pad(plainText), "utf-8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
}

function decryptAES(cipherText, key, iv) {
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key, "utf-8"), Buffer.from(iv, "utf-8"));
    let decrypted = decipher.update(cipherText, "base64", "utf-8");
    decrypted += decipher.final("utf-8");
    return unpad(decrypted);
}

function generateHash(inputString) {
    return crypto.createHash("sha256").update(inputString).digest("hex");
}

function validateChecksum(checksum, plainText) {
    return checksum === generateHash(plainText);
}

async function sendPostRequest() {
    const jsonPayload = JSON.stringify(payload);
    const encryptedPayload = encryptAES(jsonPayload, KEY, IV);
    const checksum = generateHash(encryptedPayload);

    const headers = { "Content-Type": "application/json", "partner-code": "CM" };
    const requestData = { payload: encryptedPayload, checksum: checksum };

    try {
        const response = await axios.post(API_URL, requestData, { headers });
        return response.data;
    } catch (error) {
        console.error("Error sending POST request:", error);
        throw error;
    }
}

sendPostRequest()
    .then((response) => console.log(response))
    .catch((err) => console.error(err));
