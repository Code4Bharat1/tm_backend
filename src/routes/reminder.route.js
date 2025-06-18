import express from 'express';
import multer from 'multer';
import { createReminder, getReminders, updateReminder, deleteReminder } from '../controller/reminder.controller.js';
import { authenticateUser, protectUserOrAdmin } from "../middleware/authMiddleware.js"

const router = express.Router();
const upload = multer();

router.post('/', protectUserOrAdmin, upload.array('documents'), createReminder);

router.get('/getReminder', protectUserOrAdmin, getReminders);

router.patch('/:id', protectUserOrAdmin, updateReminder);

router.delete('/:id', protectUserOrAdmin, deleteReminder)

export default router;
