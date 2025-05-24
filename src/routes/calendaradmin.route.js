// routes/calendarRoutes.js

import express from "express";
import {
    createCalendarEntryAdmin,
    getCalendarEntriesByUserAdmin,
    getCalendarEntryByIdAdmin,
    updateCalendarEntryAdmin,
    deleteCalendarEntryAdmin,
    findUserEmailById
} from "../controller/calendaradmin.controller.js";
import { protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post("/calendar",protectAdmin, createCalendarEntryAdmin);
router.get("/calendar/user/:calType",protectAdmin, getCalendarEntriesByUserAdmin);
router.get("/calendar/:id", getCalendarEntryByIdAdmin);
router.put("/calendar/:id", updateCalendarEntryAdmin);
router.delete("/calendar/:id", deleteCalendarEntryAdmin);
router.get("/email" ,protectAdmin, findUserEmailById)

export default router;
