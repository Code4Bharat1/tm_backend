import express from 'express';
import { getAllEvents, deleteEvent, updateEvent, getAllEventUserName, createEvent, getUserGames, getHistory } from '../controller/event.controller.js';
import { protect, protectAdmin } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/all', getAllEvents);
router.delete('/:id', deleteEvent);
router.put('/:id', updateEvent);
router.get("/user", protect, getAllEventUserName);
router.post("/create",createEvent)
router.get('/user-games', protect, getUserGames);
router.get('/history', getHistory)

export default router;