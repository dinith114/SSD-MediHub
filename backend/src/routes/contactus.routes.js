import express from "express";
import { getAllMessages, sendMessage } from "../controllers/contactus.controller.js";
import { isAdminAuthenticated } from "../middlewares/auth.middleware.js";
import { contactLimiter } from "../middlewares/rateLimit.middleware.js";



const router = express.Router();

// V-10 fix: throttle the public contact form so it cannot be used to flood mail.
router.post("/send", contactLimiter, sendMessage);
router.get("/getall", isAdminAuthenticated, getAllMessages);

export default router;