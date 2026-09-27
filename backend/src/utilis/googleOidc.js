import * as client from "openid-client";
import { ApiError } from "./ApiError.js";

// OAuth feature — Google OpenID Connect configuration.
//
// We use the certified `openid-client` library. It performs OIDC discovery against
// Google, and in the callback it validates state, nonce and the PKCE verifier, and
// verifies the ID token's signature against Google's JWKS together with the iss,
// aud and exp claims — so we do not hand-roll any of that security-critical logic.

let configPromise;

export const getGoogleConfig = async () => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new ApiError(503, "Google sign-in is not configured on the server.");
    }
    // Discover once and cache — Google's metadata rarely changes and this avoids a
    // network round-trip on every login.
    if (!configPromise) {
        configPromise = client.discovery(
            new URL("https://accounts.google.com"),
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
        );
    }
    return configPromise;
};

export const getRedirectUri = () =>
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:4000/api/v1/auth/google/callback";
