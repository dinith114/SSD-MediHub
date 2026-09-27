import * as client from "openid-client";
import asyncHandler from "../utilis/asyncHandler.js";
import { ApiError } from "../utilis/ApiError.js";
import { User } from "../models/user.model.js";
import { getGoogleConfig, getRedirectUri } from "../utilis/googleOidc.js";

// OAuth / OpenID Connect feature — "Sign in with Google" for patients.
// Grant type: Authorization Code + PKCE (S256). Chosen over the Implicit grant
// (which returns tokens in the URL fragment and has no client authentication) and
// over the Resource Owner Password grant (which would hand our app the user's
// Google password and is deprecated in OAuth 2.1).

const OIDC_COOKIE = "oidc_tx"; // short-lived cookie holding the one-time state/nonce/verifier
const FRONTEND_URL = () => process.env.FRONTEND_URL || "http://localhost:5173";

// GET /api/v1/auth/google/login  — start the flow
export const googleLogin = asyncHandler(async (req, res) => {
    const config = await getGoogleConfig();

    // PKCE (protects the code exchange), state (CSRF), nonce (replay).
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();
    const nonce = client.randomNonce();

    const authUrl = client.buildAuthorizationUrl(config, {
        redirect_uri: getRedirectUri(),
        scope: "openid email profile",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
        nonce,
    });

    // Keep the one-time values server-trusted in a short-lived, httpOnly cookie so
    // the callback can validate them. Never placed in the URL.
    res.cookie(OIDC_COOKIE, JSON.stringify({ state, nonce, codeVerifier }), {
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: 10 * 60 * 1000, // 10 minutes
    });

    res.redirect(authUrl.href);
});

// GET /api/v1/auth/google/callback  — Google redirects back here with ?code&state
export const googleCallback = asyncHandler(async (req, res) => {
    const config = await getGoogleConfig();

    const raw = req.cookies[OIDC_COOKIE];
    if (!raw) {
        throw new ApiError(400, "Sign-in session expired. Please try again.");
    }
    let tx;
    try {
        tx = JSON.parse(raw);
    } catch {
        throw new ApiError(400, "Invalid sign-in session.");
    }
    res.clearCookie(OIDC_COOKIE);

    // The full URL Google redirected to, including the query string.
    const currentUrl = new URL(`${req.protocol}://${req.get("host")}${req.originalUrl}`);

    // One certified call validates state + nonce + PKCE and verifies the ID token
    // signature against Google's JWKS with iss/aud/exp checks.
    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: tx.codeVerifier,
        expectedState: tx.state,
        expectedNonce: tx.nonce,
        idTokenExpected: true,
    });

    const claims = tokens.claims();
    const email = claims.email;
    const emailVerified = claims.email_verified === true;
    if (!email) {
        throw new ApiError(400, "Google did not return an email address.");
    }

    // The feature: find-or-create a Patient from Google's verified claims.
    let user = await User.findOne({ email });
    if (!user) {
        user = await User.create({
            firstName: claims.given_name || "Google",
            lastName: claims.family_name || "User",
            email,
            role: "Patient",
            authProvider: "google",
            emailVerified,
        });
    } else {
        // Existing account with this email — trust Google's verified email.
        user.authProvider = "google";
        user.emailVerified = user.emailVerified || emailVerified;
        await user.save();
    }

    // Issue our own session cookie (same shape as jwtToken.js: httpOnly, Secure,
    // SameSite=Lax) then send the user back to the frontend. No token in the URL.
    const sessionToken = user.generateJsonWebToken();
    res.cookie("patientToken", sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        expires: new Date(
            Date.now() + (Number(process.env.COOKIE_EXPIRE) || 1) * 24 * 60 * 60 * 1000
        ),
    });

    // Send the user to their account page, which shows the verified-patient status.
    res.redirect(`${FRONTEND_URL()}/profile?googleLogin=success`);
});
