const BODY = {
    payload: {
        basic_details: {
            mobile_number: "8850689034",
            email: "test@gmail.com",
            name: "Bhanupriya Bhatnagar",
            pan: "BCLPD9988G",
            date_of_birth: "15/10/1990",
        },
        address_details: { type: "COMMUNICATION", address_line: "charni Road", pincode: "400009", state_code: "MH" },
        professional_details: { occupation_type: "SALARIED", company_name: "COMPANY NAME", income: 30000 },
        loan_details: {
            amount: 10000,
            interest: { type: "FLAT", frequency: "MONTHLY", value: 3 },
            tenure: { type: "MONTHLY", value: 2 },
        },
        consent_data: {
            content: ["hello content"],
            ip_address: "127.0.0.1",
            latitude: 18.52043,
            longitude: 19.52043,
            device_id: "23456789",
            consent_dtm: "2024-09-05 12:04:31.132 +0530",
        },
    },
    api_code: "CREATE_LEAD_API_V2",
};

const crypto = require("crypto");
const axios = require("axios");
const AES_BLOCK_SIZE = 32;

function pad(inputString) {
    const padLen = AES_BLOCK_SIZE - (inputString.length % AES_BLOCK_SIZE);
    return inputString + padLen * String.fromCharCode(padLen);
}

function unpad(inputString) {
    const paddingCharacter = inputString[inputString.length - 1];
    const numberOfCharacterPadded = paddingCharacter.charCodeAt(0);
    const originalStringLength = inputString.length - numberOfCharacterPadded;
    return inputString.substring(0, originalStringLength);
}

// AES encryption
function encryptAES(plainText, key, initializationVector) {
    plainText = pad(plainText);
    const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        Buffer.from(key, "utf-8"),
        Buffer.from(initializationVector, "utf-8"),
    );
    let cipherText = cipher.update(plainText, "utf-8", "base64");
    cipherText += cipher.final("base64");
    return cipherText;
}

// AES decryption
function decryptAES(cipherText, key, initializationVector) {
    const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(key, "utf-8"),
        Buffer.from(initializationVector, "utf-8"),
    );
    let plainText = decipher.update(cipherText, "base64", "utf-8");
    plainText += decipher.final("utf-8");
    return unpad(plainText);
}

// SHA256 checksum
function generateHash(inputString) {
    return crypto.createHash("sha256").update(inputString, "utf-8").digest("hex");
}

// Validate checksum
// function validateChecksum(checksum, plainText) {
//     return checksum === generateHash(plainText);
// }

async function createLead() {
    try {
        const key = "2f01fcf3c519f5930c0a38994554b79c"; //  FIX:
        const iv = "9e718b7bf04758a1"; //  FIX:

        const plainText = JSON.stringify(BODY);
        const encryptedPayload = encryptAES(plainText, key, iv);
        const checksum = generateHash(encryptedPayload);

        const response = await axios.post(
            "https://dev-tsp-los.lendenclub.com/v2/",
            {
                payload: encryptedPayload,
                checksum: checksum,
            },
            { headers: { "Content-Type": "application/json", "partner-code": "CM" } },
        );
        console.log(response.data);

        const decryptedResponse = decryptAES(response.data.payload, key, iv);
        console.log(decryptedResponse);
    } catch (error) {
        console.error("Error creating lead:", error);
    }
}

createLead();
