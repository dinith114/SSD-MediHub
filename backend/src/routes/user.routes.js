import express from "express";
import { patientRegister, getUserDetails, getDoctorDetails } from "../controllers/user.controller.js";
import { login, logoutAdmin, logoutDoctor, logoutPatient } from "../controllers/login_logout.controller.js";
import { addNewAdmin } from "../controllers/admin.controller.js";
import { addNewDoctor, getAllDoctors } from "../controllers/doctor.controller.js";
import { isAdminAuthenticated, isPatientAuthenticated, isDoctorAuthenticated } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"
import { loginIpLimiter, loginAccountLimiter, registerLimiter } from "../middlewares/authRateLimit.middleware.js";

const router = express.Router();

// V-17 fix: limit sign-ups per IP, and failed logins per IP and per account.
router.post("/patient/register", registerLimiter, patientRegister);
router.post("/login", loginIpLimiter, loginAccountLimiter, login);
router.post("/admin/addnew", isAdminAuthenticated, addNewAdmin);
router.post("/doctor/addnew", isAdminAuthenticated, upload.single("docAvatar"), addNewDoctor);
router.get("/alldoctors", getAllDoctors);
router.get("/admin/me", isAdminAuthenticated, getUserDetails);
router.get("/patient/me", isPatientAuthenticated, getUserDetails);
router.get("/doctor/me", isDoctorAuthenticated, getDoctorDetails);
router.get("/admin/logout", isAdminAuthenticated, logoutAdmin);
router.get("/doctor/logout", isDoctorAuthenticated, logoutDoctor);
router.get("/patient/logout", isPatientAuthenticated, logoutPatient);




export default router;