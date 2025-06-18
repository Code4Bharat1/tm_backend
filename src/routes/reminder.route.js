import express from 'express';
import multer from 'multer';
import { createReminder, getReminders, updateReminder, deleteReminder } from '../controller/reminder.controller.js';
import { authenticateUser } from "../middleware/authMiddleware.js"

const router = express.Router();
const upload = multer();

router.post('/', authenticateUser, upload.array('documents'), createReminder);

router.get('/', authenticateUser, getReminders);

router.patch('/:id', authenticateUser, updateReminder);

router.delete('/:id', authenticateUser, deleteReminder)

export default router;
