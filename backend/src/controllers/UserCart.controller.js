import { ApiResponse } from "../utilis/ApiResponse.js";
import { ApiError } from "../utilis/ApiError.js";
import asyncHandler from "../utilis/asyncHandler.js";
import { UserCart } from "../models/UserCart.model.js";
import { Medicine } from "../models/medicine.model.js";


export const ToggleCart = asyncHandler(async (req, res) => {
    // V-13 fix: the owner is the logged-in patient, never a userId from the
    // request body. Trusting the body let one patient add to another's cart.
    const userId = req.user._id;
    const { medicineId, quantity, totalPrice, status } = req.body;

    if (!medicineId || !quantity || !totalPrice) {
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
    // V-13 fix: only delete a row that belongs to the logged-in patient. Scoping
    // the query by userId means one patient cannot delete another's cart row by
    // guessing its id (a row owned by someone else simply is not found -> 404).
    const cart = await UserCart.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!cart) {
        throw new ApiError(404, "Medicine not found");
    }
    return res.json(new ApiResponse(200, {}, "Medicine Deleted from Cart Successfully!"));
});

export const getUserCart = asyncHandler(async (req, res) => {
    // V-13 fix: read the cart of the logged-in patient (req.user._id), not the id
    // taken from the URL. Before, any patient could read anyone's cart just by
    // putting the victim's id in the path (IDOR).
    const cart = await UserCart.find({ userId: req.user._id });
    if (!cart) {
        throw new ApiError(404, "Cart not found");
    }
    return res.json(new ApiResponse(200, cart, "Cart Fetched Successfully!"));
});
