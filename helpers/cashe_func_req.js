var axios = require("axios");
const CryptoJS = require("crypto-js");
//------------------------------------------------------------------------------------------------------//

function generateCheckSum(data) {
    const dataStr = JSON.stringify(data);
    // const encryptedStr = CryptoJS.HmacSHA1(dataStr,"_bz_q]o2T,#(wM`D");
    const encryptedStr = CryptoJS.HmacSHA1(dataStr, "(!4Zb'4'M^0bSoyk");
    const checkSumValue = CryptoJS.enc.Base64.stringify(encryptedStr);
    return checkSumValue;
}
const checkDuplicateLead = async (mobile_no, partner_name, email_id) => {
    // const urlCashe = "https://test-partners.cashe.co.in"
    const urlCashe = "https://partners.cashe.co.in";
    try {
        const data = {
            mobile_no: mobile_no,
            partner_name: partner_name,
            email_id: email_id,
        };
        const c1 = generateCheckSum(data);
        console.log("c1:", c1);
        const casheResponse = await axios.post(`${urlCashe}/partner/checkDuplicateCustomerLead`, data, {
            headers: {
                "Content-Type": "application/json",
                "Check-Sum": c1,
            },
        });
        return casheResponse.data;
    } catch (error) {
        console.error("Error:", error.message);
        throw new Error("Internal Server Error");
    }
};
checkDuplicateLead("8094612309", "CredMantra_Partner1", "bjb@gmail.com");
