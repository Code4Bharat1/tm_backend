import express from 'express';
import { sendCalendarNotification, sendExpenseNotification, sendLeaveNotification, sendMeetingNotification, sendPostNotification } from '../controller/notification.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/user-leave', protect, sendLeaveNotification);
router.get("/post-notification", protect, sendPostNotification);
router.get("/expense-notification", protect, sendExpenseNotification);
router.get("/calendar-notification", protect, sendCalendarNotification);
router.get("/meeting-notification", protect, sendMeetingNotification);

export default router;