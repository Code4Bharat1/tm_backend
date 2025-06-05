// routes/gameRegistration.js

import express from 'express';
import {toggleRegistration, registeredUser} from '../controller/gameRegistration.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/submit', protect, toggleRegistration);
router.get('/all', protect, registeredUser);

export default router;
