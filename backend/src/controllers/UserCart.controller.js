import { ApiResponse } from "../utilis/ApiResponse.js";
import { ApiError } from "../utilis/ApiError.js";
import asyncHandler from "../utilis/asyncHandler.js";
import { UserCart } from "../models/UserCart.model.js";
import { Medicine } from "../models/medicine.model.js";


export const ToggleCart = asyncHandler(async (req, res) => {
    // V-11 fix: the client no longer sends the price. totalPrice from the body is
    // ignored — a patient used to be able to store 99 items for a total of 1, or
    // even a negative total. The server looks the medicine up and computes the
    // total itself, so the stored price always reflects the real catalogue.
    const { userId, medicineId, status } = req.body;
    const quantity = Number(req.body.quantity);

    if (!userId || !medicineId) {
        throw new ApiError(400, "Please Fill Full Form!");
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
        throw new ApiError(400, "Quantity must be a positive whole number");
    }

    // V-11 fix: the price is read from the Medicine collection, not the request.
    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
        throw new ApiError(404, "Medicine not found");
    }
    const unitPrice = Math.max(0, medicine.price - (medicine.discount || 0));
    const totalPrice = unitPrice * quantity;

    let existedCart = await UserCart.findOne({ userId, medicineId });
    if (existedCart) {
        const remvefromcart = await UserCart.findByIdAndDelete(existedCart._id);
        return res.json(new ApiResponse(200, {remvefromcart:true}, "Medicine Deleted from Cart Successfully!"));
    }

    const cart = await UserCart.create({
        userId,
        medicineId,
        quantity,
        totalPrice,
        status,
    });

    return res.
        status(201).
        json(new ApiResponse(201, cart, "Medicine Added to Cart Successfully!"));
});

export const deleteFromCart = asyncHandler(async (req, res) => {
    const cart = await UserCart.findByIdAndDelete(req.params.id);
    if (!cart) {
        throw new ApiError(404, "Medicine not found");
    }
    return res.json(new ApiResponse(200, {}, "Medicine Deleted from Cart Successfully!"));
});

export const getUserCart = asyncHandler(async (req, res) => {
    const cart = await UserCart.find({ userId: req.params.userId });
    if (!cart) {
        throw new ApiError(404, "Cart not found");
    }
    return res.json(new ApiResponse(200, cart, "Cart Fetched Successfully!"));
});
