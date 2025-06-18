import express from 'express';
import { adminCalendarNotification, adminExpenseNotification, adminSendNotification, sendCalendarNotification, sendExpenseNotification, sendLeaveNotification, sendMeetingNotification, sendPostNotification, getNotificationsByUser } from '../controller/notification.controller.js';
import { protect, protectAdmin,protectUserOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/user-leave', protect, sendLeaveNotification);
router.get("/post-notification", protect, sendPostNotification);
router.get("/expense-notification", protect, sendExpenseNotification);
router.get("/calendar-notification", protect, sendCalendarNotification);
router.get("/meeting-notification", protect, sendMeetingNotification);
router.get("/admin-leave-request", protectAdmin, adminSendNotification);
router.get("/admin-expense-request", protectAdmin, adminExpenseNotification);
router.get("/admin-calendar-reminder", protectAdmin, adminCalendarNotification);
router.get("/admin-meeting-notification", protectAdmin, sendMeetingNotification);
router.get('/reminder', protectUserOrAdmin, getNotificationsByUser);

export default router;