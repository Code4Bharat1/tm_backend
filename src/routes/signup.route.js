// routes/userRoutes.js
import express from 'express';
import { createUser, bulkCreateUsers } from '../controller/signup.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', protect, createUser);
router.post('/register/bulk', protect, bulkCreateUsers);

export default router;
