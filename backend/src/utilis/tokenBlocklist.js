import crypto from "crypto";
import jwt from "jsonwebtoken";
import { RevokedToken } from "../models/revokedToken.model.js";

// We store only a hash of the token, so the denylist never holds a usable token.
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// V-05 fix: add a token to the denylist on logout. It stays there until the token
// would have expired anyway (TTL index on the model), after which it is removed.
export const revokeToken = async (token) => {
    if (!token) return;
    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp
        ? new Date(decoded.exp * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000); // fallback: 1 day
    // upsert so logging out twice does not throw on the unique index
    await RevokedToken.updateOne(
        { tokenHash: hashToken(token) },
        { $set: { tokenHash: hashToken(token), expiresAt } },
        { upsert: true }
    );
};

// V-05 fix: called by the auth middleware on every request. A token that has been
// logged out is rejected even though its signature is still valid.
export const isTokenRevoked = async (token) => {
    if (!token) return false;
    return Boolean(await RevokedToken.exists({ tokenHash: hashToken(token) }));
};
