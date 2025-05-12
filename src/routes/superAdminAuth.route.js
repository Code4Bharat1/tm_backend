import { loginSuperAdmin, signUpSuperAdmin } from "../controller/authSuperAdmin/login.controller.js";

import { Router } from "express";

const router = Router();

// Route for super admin login
router.post("/login", loginSuperAdmin);
router.post("/signup", signUpSuperAdmin);


//creadential for super admin
// {
//   "userName": "Code4Bharat",
//   "email": "vivekkumarv273@gmail.com", 
//   "password": "Code4Bharat@123",
//   "isRoot": true,
//    "permission": ["all"]
// }


export default router;