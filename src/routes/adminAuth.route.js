import express from "express";
import { signUpAdmin } from "../controller/authAdmin/signUp.controller.js";
import { loginAdmin } from "../controller/authAdmin/login.controller.js";
import { logout } from "../controller/logout.controller.js";
import { updateAttendanceSettings, getAttendanceSettings } from "../controller/companyRegistration.controller.js";
import { protectAdmin } from "../middleware/authMiddleware.js";


const router = express.Router();

router.post("/adminSignUp", signUpAdmin)
router.post("/adminLogin", loginAdmin);
router.post("/adminLogout", logout);
router.put("/attendance-settings",protectAdmin, updateAttendanceSettings);
router.get("/attendance-settings", protectAdmin, getAttendanceSettings);

export default router;