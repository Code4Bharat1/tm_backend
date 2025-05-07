import express from "express";
import { logout } from "../controller/logout.controller.js";


const router = express.Router();

router.post("/logout", logout);

export default router;