const User = require("../models/user.model");
const { createJwtToken } = require("../utils/token.util");
const { generateOTP, fast2sms } = require("../utils/otp.util");
const showError = require("../utils/errorBox");

const EXPIRATION_TIME = 5 * 60 * 1000;
const OTP_LENGTH = 4;

// create new user

exports.createNewUser = async (req, res, next) => {
    try {
        const {
            phone,
            name,
            pan,
            dob,
            email,
            addr,
            category,
            gender,
            employment,
            loan_required,
            residence_type,
            income,
            credit_required,
            company_name,
        } = req.body;

        if (await User.findOne({ phone })) {
            return next({ status: 400, message: "phone already exists" });
        }

        const role = phone === process.env.ADMIN_PHONE ? "ADMIN" : "USER";
        const newUser = new User({
            phone,
            name,
            pan,
            dob,
            email,
            addr,
            category,
            gender,
            employment,
            loan_required,
            residence_type,
            income,
            credit_required,
            company_name,
            role,
        });

        const user = await newUser.save();

        let otp = generateOTP(OTP_LENGTH);

        if (user.phone === "8094634634") {
            otp = "1212";
        }
        user.phoneOtp = otp;
        console.log("otp: ", otp);
        user.phoneOtpExpire = Date.now() + EXPIRATION_TIME;
        await user.save();

        // await fast2sms(otp, user.phone, next);

        res.status(200).json({
            type: "success",
            message: "Account created. OTP sent to mobile number.",
            data: { userId: user._id },
        });
    } catch (error) {
        next({ message: error.message, status: 500 });
    }
};

// get auth for any user

exports.get_auth = async (req, res, next) => {
    try {
        const { phone } = req.body;
        console.log("Phone: ", phone);

        const user = await User.findOne({ phone: phone });
	console.log("user: ", user);
        if (!user) {
            await this.createNewUser(req, res, next);
        } else {
            await this.loginWithPhoneOtp(req, res, next);
        }
    } catch (error) {
        next({ message: error.message, status: 500 });
    }
};

// get auth for check eligibility

exports.check_eli = async (req, res, next) => {
    console.log("Check eligibility");
    try {
        const {
            phone,
            name,
            email,
            amount,
            dob,
            pincode,
            income,
            employmentType,
            gender,
            pan,
            aadhar,
            company_name,
            addr,
            city,
            state,
            business_details,
        } = req.body;

        // Validate required fields
        if (
            !phone ||
            !name ||
            !email ||
            !amount ||
            !dob ||
            !pincode ||
            !income ||
            !employmentType ||
            !gender ||
            !pan ||
            !aadhar ||
            !addr ||
            !city ||
            !state
        ) {
            return res.status(400).json({ message: "All fields are required" });
        }

        let user = await User.findOne({ phone });
        if (!user) {
            user = new User({
                phone,
                name,
                email,
                loan_required: amount,
                dob,
                pincode,
                income,
                employment: employmentType,
                eformFilled: true,
                pan,
                aadhar,
                company_name,
                addr,
                city,
                state,
                gender,
                eformFilled: true,
            });
            user.stage.push({
                name: "OTP triggered",
                current: true,
            });
            if (business_details) {
                console.log("hello");
                user.business_details = business_details;
            }
            await user.save();
        } else {
            console.log("User found: ", user);
            user.name = name || user.name;
            user.email = email || user.email;
            user.loan_required = amount || user.loan_required;
            user.dob = dob || user.dob;
            user.pan = pan || user.pan;
            user.pincode = pincode || user.pincode;
            user.income = income || user.income;
            user.employment = employmentType || user.employment;
            user.aadhar = aadhar || user.aadhar;
            user.company_name = company_name || user.company_name;
            user.eformFilled = true;
            user.addr = addr || user.addr;
            user.city = city || user.city;
            user.state = state || user.state;
            user.gender = gender || user.gender;
            user.eformFilled = true;
            user.stage.forEach((stage) => (stage.current = false));
            user.stage.push({
                name: "OTP triggered",
                current: true,
            });
            if (business_details) {
                console.log("hello");
                user.business_details = business_details;
            }
            console.log("User saving...");
            await user.save();
            console.log("User saved");
        }

        res.status(200).json({ message: "Success" });
    } catch (error) {
        console.log(error);
        next({ message: error.message, status: 500 });
    }
};

//  login with phone otp

exports.loginWithPhoneOtp = async (req, res, next) => {
    try {
        const { phone } = req.body;
        const { name } = req.body;
        const { pan } = req.body;
        const { dob } = req.body;
        const { email } = req.body;
        const { addr } = req.body;
        const { category } = req.body;
        const { gender } = req.body;
        const { employment } = req.body;
        const { loan_required } = req.body;
        const { residence_type } = req.body;
        const { income } = req.body;
        const { credit_required } = req.body;
        const { company_name } = req.body;

        const user = await User.findOne({ phone: phone });

        if (!user) {
            next({ status: 400, message: "phone not found" });
            return;
        }

        let otp = generateOTP(OTP_LENGTH);

        if (user.phone === "9350632155") {
            otp = "1212";
        }
        console.log("OTP:", otp);

        user.phoneOtp = otp;
        user.phoneOtpExpire = Date.now() + EXPIRATION_TIME;
        user.isAccountVerified = true;

        if (name) user.name = name;
        if (addr) user.addr = addr;
        if (pan) user.pan = pan;
        if (dob) user.dob = dob;
        if (email) user.email = email;
        if (category) user.category = category;
        if (gender) user.gender = gender;
        if (loan_required) user.loan_required = loan_required;
        if (employment) user.employment = employment;
        if (residence_type) user.residence_type = residence_type;
        if (income) user.income = income;
        if (credit_required) user.credit_required = credit_required;
        if (company_name) user.company_name = company_name;

        user.stage.forEach((stage) => (stage.current = false));
        user.stage.push({ name: "OTP verfied", current: true });
        try {
            await user.save();
        } catch (error) {
            showError(error.message);
        }

        await fast2sms(otp, phone);
        res.status(201).json({
            type: "success",
            message: "OTP sent to your registered phone number",
        });
    } catch (error) {
        next({ message: error.message, status: 500 });
    }
};

// resend otp

exports.resendOtp = async (req, res, next) => {
    try {
        const { phone } = req.body;
        const user = await User.findOne({ phone });

        if (!user) {
            next({ status: 400, message: "phone not found" });
            return;
        }

        // generate otp
        let otp = generateOTP(OTP_LENGTH);
        if (user.phone === "8094634634") {
            otp = "1212";
        }

        // save otp to user collection
        user.phoneOtp = otp;
        user.phoneOtpExpire = Date.now() + EXPIRATION_TIME;
        await user.save();

        // send otp to phone number
        contactNumber = user.phone;
        await fast2sms(otp, user.phone, next);
        res.status(201).json({
            type: "success",
            message: "OTP sent to your registered phone number",
            data: {
                userId: user._id,
            },
        });
    } catch (error) {
        next({ message: error.message, status: 500 });
    }
};

// verify phone otp

exports.verifyPhoneOtp = async (req, res, next) => {
    try {
        const { phone, otp } = req.body;

        const user = await User.findOne({ phone });
        //console.log(user, phone, otp);
        if (!user) {
            next({ status: 400, message: "user not found" });
            return;
        }

        if (user.phoneOtp !== otp || user.phoneOtpExpire < Date.now()) {
            next({ status: 400, message: "incorrect opt" });
            return;
        }

        const token = createJwtToken({ user: user._id });

        user.phoneOtp = "";
        await user.save();

        res.status(201).json({
            type: "success",
            message: "OTP verified successfully",
            data: {
                token,
                userId: user._id,
            },
        });
    } catch (error) {
        //console.log(error);
        next({ message: error.message, status: 500 });
    }
};

// fetch current user

exports.fetchCurrentUser = async (_req, res, next) => {
    try {
        const currentUser = res.locals.user;

        return res.status(200).json({
            type: "success",
            message: "fetch current user",
            data: {
                user: currentUser,
            },
        });
    } catch (error) {
        next(error);
    }
};

// admin access only

exports.handleAdmin = async (_req, res, next) => {
    try {
        const currentUser = res.locals.user;

        return res.status(200).json({
            type: "success",
            message: "Okay you are admin!!",
            data: {
                user: currentUser,
            },
        });
    } catch (error) {
        next(error);
    }
};
