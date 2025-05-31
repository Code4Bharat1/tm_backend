// routes/calendarRoutes.js

import express from "express";
import {
    createCalendarEntry,
    getCalendarEntriesByUser,
    getCalendarEntryById,
    updateCalendarEntry,
    deleteCalendarEntry,
    getMonthlyCalendarForUser
} from "../controller/calendaruser.controller.js";
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post("/calendar",protect, createCalendarEntry);
router.get("/calendar/user",protect, getCalendarEntriesByUser);
router.get("/calendar/user/monthly", protect, getMonthlyCalendarForUser);
router.get("/calendar/:id", getCalendarEntryById);
router.put("/calendar/:id", updateCalendarEntry);
router.delete("/calendar/:id", deleteCalendarEntry);

export default router;
