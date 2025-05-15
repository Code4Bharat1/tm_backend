import { generateOtp, verifyOtpAndChangePassword, generateOtpAdmin, verifyOtpAndChangePasswordAdmin } from "../controller/forgotpassword.controller.js";
import express from "express";

const router = express.Router();
// OTP generation route
router.post("/generate-otp", generateOtp);
router.post("/generate-otp-admin", generateOtpAdmin);

// OTP verification route
router.post("/verify-otp", verifyOtpAndChangePassword);
router.post("/verify-otp-admin", verifyOtpAndChangePasswordAdmin);

export default router;