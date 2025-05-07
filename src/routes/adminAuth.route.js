import express from "express";
import { signUpAdmin } from "../controller/authAdmin/signUp.controller.js";
import { loginAdmin } from "../controller/authAdmin/login.controller.js";
import { logout } from "../controller/logout.controller.js";


const router = express.Router();

router.post("/adminSignUp", signUpAdmin)
router.post("/adminLogin", loginAdmin);
router.post("/adminLogout", logout);

export default router;