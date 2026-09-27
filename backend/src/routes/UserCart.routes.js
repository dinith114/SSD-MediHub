import express from 'express';
import {
    ToggleCart,
    deleteFromCart,
    getUserCart,
} from '../controllers/UserCart.controller.js';
import { isPatientAuthenticated } from "../middlewares/auth.middleware.js";

const router = express.Router();

// V-12 fix: guard every cart route with isPatientAuthenticated. The middleware
// was imported but applied to only /user-cart, so add-to-cart and
// delete-from-cart accepted requests with no login (and no role) at all. All
// three routes change a patient's own cart, so all three now require a valid
// patient session.
router.post("/add-to-cart", isPatientAuthenticated, ToggleCart);
router.delete("/delete-from-cart/:id", isPatientAuthenticated, deleteFromCart);
router.get("/user-cart/:userId", isPatientAuthenticated, getUserCart);

export default router