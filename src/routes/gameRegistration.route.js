// routes/gameRegistration.js

import express from 'express';
import toggleRegistration from '../controller/gameRegistration.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/submit', protect, toggleRegistration);

export default router;
