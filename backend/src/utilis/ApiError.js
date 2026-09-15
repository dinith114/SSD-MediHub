import fs from "fs";
import multer from "multer";

class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
    }
}

export const errorHandler = (err, req, res, next) => {
    // V-09 fix: if a file was uploaded but the request then failed, delete the
    // temp file so rejected uploads do not pile up on disk. One place covers
    // every upload route.
    const uploaded = req.file ? [req.file] : (req.files || []);
    for (const f of uploaded) {
        if (f?.path) { try { fs.unlinkSync(f.path); } catch (_) { /* already gone */ } }
    }

    // V-09 fix: turn multer's own errors (wrong type, too big) into a clean 400.
    if (err instanceof multer.MulterError) {
        const message = err.code === "LIMIT_FILE_SIZE"
            ? "File too large. Maximum size is 2 MB."
            : (err.field || err.message || "File upload rejected.");
        err = new ApiError(400, message);
    }

    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";

    if (err.code === 11000) {
        const message = `Duplicate ${Object.keys(err.keyValue)} Entered`;
        err = new ApiError(400, message);
    }
    if (err.name === "JsonWebTokenError") {
        const message = `Json Web Token is invalid, Try again!`;
        err = new ApiError(400, message);
    }
    if (err.name === "TokenExpiredError") {
        const message = `Json Web Token is expired, Try again!`;
        err = new ApiError(400, message);
    }
    if (err.name === "CastError") {
        const message = `Invalid ${err.path}`;
        err = new ApiError(400, message);
    }

    const errorMessage = err.errors
        ? Object.values(err.errors)
            .map((error) => error.message)
            .join(" ")
        : err.message;

    return res.status(err.statusCode).json({
        success: false,
        // message: err.message,
        message: errorMessage,
    });
};

export { ApiError };