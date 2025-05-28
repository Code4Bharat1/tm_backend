// routes/userRoutes.js
import express from 'express';
import { createUser, bulkCreateUsers, getAllEmployee } from '../controller/signup.controller.js';
import { protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', protectAdmin, createUser);
router.post('/register/bulk', protectAdmin, bulkCreateUsers);
router.get('/employee' , protectAdmin, getAllEmployee);

export default router;
