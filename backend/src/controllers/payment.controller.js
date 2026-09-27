// import { instance } from "../../index.js";
import crypto from "crypto";
import asyncHandler from "../utilis/asyncHandler.js";
import { ApiError } from "../utilis/ApiError.js";
import { Payment } from "../models/payment.model.js";

// V-06 fix: both controllers are now wrapped in asyncHandler, like every other
// controller in the app. Previously `checkout` was an unwrapped async function
// that referenced an undefined `instance` (the Razorpay client was never
// initialised). The rejected promise was never caught by Express, so a single
// unauthenticated request crashed the whole Node process — a denial of service.
// asyncHandler forwards any error to the global error handler, keeping the
// server alive and returning a clean response instead.
export const checkout = asyncHandler(async (req, res) => {
  // The Razorpay client is not configured in this project, so `instance` is
  // undefined. Fail cleanly with a 503 instead of throwing a raw ReferenceError
  // (which also avoids leaking the internal variable name). Wiring up a real,
  // server-validated payment amount is tracked separately as V-11.
  if (typeof instance === "undefined") {
    throw new ApiError(503, "Payment service is not configured");
  }

  const options = {
    amount: Number(req.body.amount * 100),
    currency: "INR",
  };
  const order = await instance.orders.create(options);

  res.status(200).json({
    success: true,
    order,
  });
});

export const paymentVerification = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } =
    req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_APT_SECRET)
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    await Payment.create({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    res.redirect(
      `${process.env.FRONTEND_URL}/paymentsuccess?reference=${razorpay_payment_id}`
    );
  } else {
    res.status(400).json({
      success: false,
    });
  }
});
