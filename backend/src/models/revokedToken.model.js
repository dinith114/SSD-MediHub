import mongoose from "mongoose";

// V-05 fix: a denylist of session tokens that have been logged out. A JWT is
// stateless and stays cryptographically valid until it expires, so "logging out"
// has to be recorded server-side. We store only a SHA-256 hash of the token, never
// the token itself. The TTL index removes each entry once the token would have
// expired anyway, so the denylist never grows without bound.
const revokedTokenSchema = new mongoose.Schema(
    {
        tokenHash: { type: String, required: true, unique: true },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

// TTL index: MongoDB deletes the document when expiresAt is reached.
revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RevokedToken = mongoose.model("RevokedToken", revokedTokenSchema);
