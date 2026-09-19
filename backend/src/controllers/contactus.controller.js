import asyncHandler from "../utilis/asyncHandler.js";
import { ApiError } from "../utilis/ApiError.js";
import { ApiResponse } from "../utilis/ApiResponse.js";
import { ContactUs } from "../models/contactus.model.js";
import nodemailer from "nodemailer";
import validator from "validator";

const MAX_MESSAGE_LENGTH = 5000;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // Convert the string to a boolean
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

export const sendMessage = asyncHandler(async (req, res, next) => {
    const { email, message } = req.body;

    if (!email || !message) {
        throw new ApiError(400, "Please fill in the entire form!");
    }

    // V-10 fix: the fields must be plain strings, not objects (blocks operator
    // injection reaching the query), and the email must be a real address.
    if (typeof email !== "string" || typeof message !== "string") {
        throw new ApiError(400, "Invalid input.");
    }
    if (!validator.isEmail(email)) {
        throw new ApiError(400, "Please enter a valid email address.");
    }
    // V-10 fix: reject CR/LF so the email cannot be used to inject extra mail
    // headers (CRLF header injection).
    if (/[\r\n]/.test(email)) {
        throw new ApiError(400, "Invalid email address.");
    }
    // V-10 fix: cap the message length so it cannot be abused as a huge payload.
    if (message.length > MAX_MESSAGE_LENGTH) {
        throw new ApiError(400, `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`);
    }

    // Store the message in the database
    const createdMessage = await ContactUs.create({
        email,
        message,
    });

    // Configure email message
    // V-10 fix: send FROM our own verified address, never the user's. The user's
    // address goes in replyTo, so replies still reach them but the "From" header
    // cannot be spoofed to impersonate anyone.
    const mailOptions = {
        from: process.env.SMTP_USER, // our verified sender
        replyTo: email,              // where replies go (the visitor)
        to: process.env.SMTP_USER,   // recipient (the site's inbox)
        subject: "New Message from User: MediHub",
        text: message,
    };
    // send mail
    try {
        const info = await transporter.sendMail(mailOptions);
        res.status(200).json(new ApiResponse(200, info, "Message and Email sent successfully"));
    } catch (error) {
        throw new ApiError(400, "Message sent but email failed!");
    }
}
);

export const getAllMessages = asyncHandler(async (req, res, next) => {
    const messages = await ContactUs.find();
    return res.status(200).json(new ApiResponse(200, messages));
});
