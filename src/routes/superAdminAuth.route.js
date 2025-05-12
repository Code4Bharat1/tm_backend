import { loginSuperAdmin } from "../controller/authSuperAdmin/login.controller.js";

import { Router } from "express";

const router = Router();

// Route for super admin login
router.post("/login", loginSuperAdmin);

export default router;