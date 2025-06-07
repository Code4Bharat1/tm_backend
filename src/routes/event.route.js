import express from 'express';
import { getAllEvents, deleteEvent, updateEvent, getAllEventUserName,createEvent } from '../controller/event.controller.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/all', getAllEvents);
router.delete('/:id', deleteEvent);
router.put('/:id', updateEvent);
router.get("/user", protect, getAllEventUserName);
router.post("/create",createEvent)

export default router;