// routes/calendarRoutes.js

import express from "express";
import {
    createCalendarEntryAdmin,
    getCalendarEntriesByUserAdmin,
    getCalendarEntryByIdAdmin,
    updateCalendarEntryAdmin,
    deleteCalendarEntryAdmin
} from "../controller/calendaradmin.controller.js";

const router = express.Router();

router.post("/calendar", createCalendarEntryAdmin);
router.get("/calendar/user/:userId", getCalendarEntriesByUserAdmin);
router.get("/calendar/:id", getCalendarEntryByIdAdmin);
router.put("/calendar/:id", updateCalendarEntryAdmin);
router.delete("/calendar/:id", deleteCalendarEntryAdmin);

export default router;
