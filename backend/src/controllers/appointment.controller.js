import asyncHandler from "../utilis/asyncHandler.js";
import { ApiError } from "../utilis/ApiError.js";
import { ApiResponse } from "../utilis/ApiResponse.js";
import { Appointment } from "../models/appointment.model.js";

// Controller function for booking an appointment
export const bookAppointment = asyncHandler(async (req, res, next) => {
    const patientId = req.user; // Get patient ID from authenticated user
    const doctorId = req.doctor; // Get doctor ID from authenticated doctor

    const { city, pincode, appointmentDate, department } = req.body;

    // Check if all required fields are provided
    if (!city || !pincode || !appointmentDate || !department) {
        throw new ApiError(400, "Please provide all required fields");
    }


    // Check if appointment already exists for this patient and doctor
    const existedAppointment = await Appointment.findOne({
        patient: patientId,
        doctor: doctorId
    });

    if (existedAppointment) {
        throw new ApiError(400, "Your appointment was already booked. Please wait for any update!");
    }


    // Create the appointment
    const createdAppointment = await Appointment.create({
        patient: patientId,
        patientFirstName: patientId.firstName,
        patientLastName: patientId.lastName,
        doctor: doctorId,
        doctorFirstName: doctorId.firstName,
        doctorLastName: doctorId.lastName,
        experience: doctorId.experience,
        appointmentCharges: doctorId.appointmentCharges,
        city,
        pincode,
        appointmentDate,
        department,
    });

    return res.status(201).json(
        new ApiResponse(200, createdAppointment, "Your Appointment Booked!")
    )
});

// Controller function for updating an appointment
export const updateAppointmentStatus = asyncHandler(async (req, res, next) => {

    const { id } = req.params;

    // V-14 fix (mass assignment): accept ONLY the status field. The old code
    // passed req.body straight to the update, so a doctor could rewrite the
    // patient's name, the charges, the department — or even reassign the doctor.
    const { status } = req.body;
    const allowed = ["Pending", "Accepted", "Rejected"];
    if (!allowed.includes(status)) {
        throw new ApiError(400, `status must be one of: ${allowed.join(", ")}`);
    }

    // V-14 fix (ownership): only the doctor the appointment belongs to may update
    // it. Scoping the query by doctor means another doctor's appointment is simply
    // not found (404), so a doctor cannot touch appointments that are not theirs.
    const appointment = await Appointment.findOneAndUpdate(
        { _id: id, doctor: req.doctor._id },
        { status },
        { new: true, runValidators: true },
    );
    if (!appointment) {
        throw new ApiError(404, "Appointment not found");
    }

    res
        .status(200)
        .json(new ApiResponse(200, appointment, "Appointment Status Updated!"));
});

// Controller function for deleting an appointment
export const deleteAppointment = asyncHandler(async (req, res, next) => {

    const { id } = req.params;

    let appointment = await Appointment.findById(id);
    if (!appointment) {
        throw new ApiError(404, "Appointment not found");
    }
    // Find the appointment by ID and delete it
    await appointment.deleteOne();

    res
        .status(200)
        .json(new ApiResponse(200, appointment, "Appointment Succesfully Deleted"));
});

// Controller function for getting all appointments
export const getAllAppointments = asyncHandler(async (req, res, next) => {

    // V-15 fix: return only the appointments that belong to the logged-in doctor.
    // Appointment.find() with no filter returned every patient's appointment to
    // any doctor (name, city, pincode, date, department — health data). Scope the
    // query to req.doctor._id, the doctor the verified session belongs to.
    const appointments = await Appointment.find({ doctor: req.doctor._id });

    res
        .status(200)
        .json(new ApiResponse(200, appointments, "All Appointments List"));
});