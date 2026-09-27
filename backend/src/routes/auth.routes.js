import express from "express";
import { googleLogin, googleCallback } from "../controllers/auth.controller.js";

// OAuth feature routes, mounted at /api/v1/auth
const router = express.Router();

// Start the Google OpenID Connect flow (redirects to Google's consent screen).
router.get("/google/login", googleLogin);

// Google redirects back here with the authorization code.
router.get("/google/callback", googleCallback);

export default router;
