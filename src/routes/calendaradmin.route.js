// routes/calendarRoutes.js

import express from "express";
import {
    createCalendarEntry,
    getCalendarEntriesByUser,
    getCalendarEntryById,
    updateCalendarEntry,
    deleteCalendarEntry
} from "../controller/calendaruser.controller.js";

const router = express.Router();

router.post("/calendar", createCalendarEntry);
router.get("/calendar/user/:userId", getCalendarEntriesByUser);
router.get("/calendar/:id", getCalendarEntryById);
router.put("/calendar/:id", updateCalendarEntry);
router.delete("/calendar/:id", deleteCalendarEntry);

export default router;
