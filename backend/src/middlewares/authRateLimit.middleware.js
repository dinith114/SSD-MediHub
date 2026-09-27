import rateLimit from "express-rate-limit";

// V-18 fix: throttle password guessing and bulk sign-ups. Before this, 30 wrong
// admin passwords went through in seconds, and the right one was still accepted.

// Login, per IP: stops one machine hammering the form. Only failed attempts
// count (skipSuccessfulRequests), so normal logins are never slowed down.
export const loginIpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                  // 20 failed logins per IP per window
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many failed login attempts. Please try again later." },
});

// Login, per account: stops guessing one account's password from many IPs.
// Keyed on the email being tried, so it acts as a temporary lockout.
export const loginAccountLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                   // 5 failed logins per account per window
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
        const email = req.body?.email;
        return typeof email === "string" ? email.trim().toLowerCase() : "(no email)";
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many failed login attempts. Please try again later." },
});

// Registration, per IP: a person signs up once, not dozens of times an hour.
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,                  // 10 sign-ups per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many sign-ups from this network. Please try again later." },
});
