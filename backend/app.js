import dotenv from "dotenv";

import express from "express";
import cookieParser from "cookie-parser";
import { errorHandler } from "./src/utilis/ApiError.js";
import cors from "cors";

const app = express();

// dotenv configuration
dotenv.config({
  path: "./.env",
});

// cors middleware configuration connects frontend to backend
app.use(
  cors({
    origin: [process.env.FRONTEND_URL, process.env.DASHBOARD_URL],
    method: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// V-02 fix (CSRF defence in depth): reject state-changing requests whose Origin
// (or Referer) is present but not in our allow-list. A browser always sends an
// Origin header on a cross-site request, so a request forged by an attacker's
// page is blocked here, while legitimate same-site requests and non-browser
// clients (which send no Origin) pass through. This complements the SameSite=Lax
// cookie attribute set in utilis/jwtToken.js.
const allowedOrigins = [process.env.FRONTEND_URL, process.env.DASHBOARD_URL].filter(Boolean);
app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  if (origin) {
    if (!allowedOrigins.includes(origin)) {
      return res.status(403).json({ success: false, message: "Cross-site request blocked" });
    }
  } else if (referer) {
    if (!allowedOrigins.some((o) => referer.startsWith(o))) {
      return res.status(403).json({ success: false, message: "Cross-site request blocked" });
    }
  }
  next();
});

// import routes
import userRouter from "./src/routes/user.routes.js";
import contactUsRouter from "./src/routes/contactus.routes.js";
import appointmentRouter from "./src/routes/appointment.routes.js";
import medicineRouter from "./src/routes/medicine.routes.js";
import CartRouter from "./src/routes/UserCart.routes.js";
import PaymentRouter from "./src/routes/payment.routes.js";
import TestimonialRouter from "./src/routes/testimonial.routes.js";

// Define the root route
// app.get('/', (req, res) => {
//   res.send('Welcome to the homepage!');
// });

// routes declaration
app.use("/api/v1/user", userRouter);
app.use("/api/v1/message", contactUsRouter);
app.use("/api/v1/appointment", appointmentRouter);
app.use("/api/v1/medicines", medicineRouter);
app.use("/api/v1/medicines-cart", CartRouter)
app.use("/api/v1/payment", PaymentRouter)
app.use("/api/v1/testimonial", TestimonialRouter)


// error middleware
app.use(errorHandler);
export default app;
