import axios from "axios";
import bcrypt from "bcrypt";
import asyncHandler from "../utilis/asyncHandler.js";
import { ApiError } from "../utilis/ApiError.js";
import { User } from "../models/user.model.js";
import { Doctor } from "../models/doctor.model.js"
import { generateToken } from "../utilis/jwtToken.js";

// V-20 fix: a hash of a throwaway value. When the email has no account, login
// still checks the password against this, so it takes as long as a real account.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);


//! Login the user
export const login = asyncHandler(async (req, res, next) => {
    // taking the info from the user
    const { email, password, confirmPassword, role, token } = req.body;

    // checking the info provided by the user
    if (!email || !password || !confirmPassword || !role) {
        // V-04 fix: arguments were reversed here (message, statusCode). ApiError is
        // (statusCode, message), so the status code became a string, res.status()
        // threw, and Express leaked a full stack trace. Correct order below.
        throw new ApiError(400, "Please Fill Full Form!");
    }
    // check if password and confirm password matches
    if (password !== confirmPassword) {
        throw new ApiError(400, "Password and Confirm Password do not match!");
    }

    // Verify the reCAPTCHA token.
    // V-01 fix: the reCAPTCHA server secret is read from the environment, never hardcoded.
    // Fail closed — if the secret is not configured, refuse the login instead of skipping
    // the check, so a misconfigured deployment can never silently disable bot protection.
    const recaptchaSecret = process.env.RECAPTCHA_SECRET;
    if (!recaptchaSecret) {
        throw new ApiError(500, "Server misconfiguration: reCAPTCHA secret is not set");
    }

    const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
        params: {
            secret: recaptchaSecret,
            response: token
        }
    });

    if (!response.data.success) {
        throw new ApiError(400, "reCAPTCHA verification failed");
    }

    // ! checking the user provide correct details for login
    // find the user in database via email 
    let user;
    if (role === "Patient" || role === "Admin") {
        // Find user in user collection
        user = await User.findOne({ email }).select("+password");
    } else if (role === "Doctor") {
        // Find doctor in doctor collection
        user = await Doctor.findOne({ email }).select("+password");
    } else {
        throw new ApiError(400, "Invalid email or password");
    }

    // Check if user or doctor exists
    // V-20 fix: the same answer whether or not the account exists. Before, an
    // unknown email got "User with <role> role not found", so anyone could test
    // which emails are registered. The dummy comparison keeps the timing the same.
    if (!user) {
        await bcrypt.compare(password, DUMMY_HASH);
        throw new ApiError(400, "Invalid email or password");
    }


    // Check if password matches
    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
        // V-04 fix: same reversed-argument bug as above. Correct order (statusCode, message).
        throw new ApiError(400, "Invalid email or password");
    }

    generateToken(user, "User Logged In Successfully", 200, res)
})


//! Logout Admin
export const logoutAdmin = asyncHandler(async (req, res, next) => {
    res
        .status(200)
        .cookie("adminToken", "", {
            expires: new Date(Date.now()),
            httpOnly: true,
            secure: true,
            sameSite: "Lax" // V-02 fix: was "None" — cleared with the same attributes it was set with
        })
        .json({
            success: true,
            message: "Admin logged out Successfully"
        });
})


//! Logout Patient
export const logoutPatient = asyncHandler(async (req, res, next) => {
    res
        .status(200)
        .cookie("patientToken", "", {
            expires: new Date(Date.now()),
            httpOnly: true,
            secure: true,
            sameSite: "Lax" // V-02 fix: was "None" — cleared with the same attributes it was set with
        })
        .json({
            success: true,
            message: "User logged out Successfully"
        });
})


//! Logout Doctor
export const logoutDoctor = asyncHandler(async (req, res, next) => {
    res
        .status(200)
        .cookie("doctorToken", "", {
            expires: new Date(Date.now()),
            httpOnly: true,
            secure: true,
            sameSite: "Lax" // V-02 fix: was "None" — cleared with the same attributes it was set with
        })
        .json({
            success: true,
            message: "User logged out Successfully"
        });
})