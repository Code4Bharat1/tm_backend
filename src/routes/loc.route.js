import express from 'express';
import { protect, protectAdmin } from "../middleware/authMiddleware.js";
import { createLetter } from '../controller/loc.controller.js';
const router = express.Router();

router.post('/letter', protect, createLetter);

export default router;