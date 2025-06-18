import express from 'express';
import multer from 'multer';
import { createReminder, getReminders, updateReminder, deleteReminder } from '../controller/reminder.controller.js';
import { authenticateUser, protectAdmin, protectUserOrAdmin,protect } from "../middleware/authMiddleware.js"

const router = express.Router();
const upload = multer();

router.post('/admin', protectAdmin, upload.array('documents'), createReminder);
router.post('/user', protect, upload.array('documents'), createReminder);

router.get('/admin/getReminder', protectAdmin, getReminders);
router.get('/user/getReminder', protect, getReminders);

router.patch('/admin/:id', protectAdmin, updateReminder);
router.patch('/user/:id', protect, updateReminder);

router.delete('/admin/:id', protectAdmin, deleteReminder)
router.delete('/user/:id', protect, deleteReminder)

export default router;
