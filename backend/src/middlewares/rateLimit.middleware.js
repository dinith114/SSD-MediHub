import rateLimit from "express-rate-limit";

// Reusable throttles. Shared so other routes (login, register, etc.) can use
// the same limiter later without redefining it.

// Contact form: a normal person sends one or two messages, not dozens.
export const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                   // 5 messages per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many messages. Please try again later." },
});
