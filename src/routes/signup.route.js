// routes/userRoutes.js
import express from 'express';
import { createUser, bulkCreateUsers, getAllEmployee, updateUserPosition,deleteUser } from '../controller/signup.controller.js';
import { protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', protectAdmin, createUser);
router.post('/register/bulk', protectAdmin, bulkCreateUsers);
router.get('/employee' , protectAdmin, getAllEmployee);
router.patch('/update-position/:userId',protectAdmin, updateUserPosition);
router.delete('/delete/:userId',protectAdmin, deleteUser);

export default router;
