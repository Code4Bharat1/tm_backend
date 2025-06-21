import express from "express";
import { searchAll } from "../controller/search.controller.js";
import { protectAdmin } from "../middleware/authMiddleware.js";
const router = express.Router();

router.get("/search", protectAdmin, searchAll);

export default router;
