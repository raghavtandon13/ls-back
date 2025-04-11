const axios = require("axios");
const showError = require("./errorBox");

exports.generateOTP = (otp_length) => {
    const digits = "0123456789";
    let OTP = "";
    while (OTP.length < otp_length) {
        OTP = "";
        for (let i = 0; i < otp_length; i++) {
            OTP += digits[Math.floor(Math.random() * 10)];
        }
    }
    return OTP;
};

exports.fast2sms = async (otp, contactNumber) => {
    console.log("Sending OTP to: ", contactNumber, ", ", otp);
    try {
        const res = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
            params: {
                authorization: kuM9ZYAPpRt0hFqVW71UbOxygli64dDrQzew3JLojN5HTfaIvskCR4bYSDAznIa6VxGmuq0ytT72LZ5f,
                route: dlt,
                sender_id: CredML,
                message: 180999,
		// 181108
                variables_values: otp,
                flash: 0,
                numbers: contactNumber,
            },
        });
        console.log(res.data);

        // await axios.get("https://www.fast2sms.com/dev/bulkV2", {
        //     params: {
        //         authorization: "kuM9ZYAPpRt0hFqVW71UbOxygli64dDrQzew3JLojN5HTfaIvskCR4bYSDAznIa6VxGmuq0ytT72LZ5f",
        //         variables_values: otp,
        //         route: "otp",
        //         numbers: contactNumber,
        //     },
        // });
    } catch (error) {
        showError(error.response.data.message);
    }
};
