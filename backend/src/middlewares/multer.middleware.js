import multer from "multer";
import crypto from "crypto";
import path from "path";

// V-09 fix: only real images, capped size, and a safe random filename.
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp");
    },
    filename: function (req, file, cb) {
        // Never trust the client's filename. Generate our own; keep only a
        // known-safe extension so nothing like "evil.exe" or a path can survive.
        const ext = path.extname(file.originalname).toLowerCase();
        const safeExt = ALLOWED_EXT.has(ext) ? ext : "";
        cb(null, `${crypto.randomUUID()}${safeExt}`);
    },
});

// Reject anything that is not an allowed image, by BOTH mime type and extension.
function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.has(ext)) {
        return cb(null, true);
    }
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only PNG, JPG or WEBP image files are allowed"));
}

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});
