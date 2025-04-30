import { generateOtp, verifyOtpAndChangePassword } from "../controller/forgotpassword.controller.js";
import express from "express";

const router = express.Router();
// OTP generation route
router.post("/generate-otp", generateOtp);

// OTP verification route
router.post("/verify-otp", verifyOtpAndChangePassword);

export default router;