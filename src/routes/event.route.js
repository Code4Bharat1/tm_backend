import express from 'express';
import { 
  getAllEvents, 
  deleteEvent, 
  updateEvent, 
  getAllEventUserName, 
  createEvent, 
  getUserGames, 
  getHistory 
} from '../controller/event.controller.js';
import { protect, protectAdmin, protectUserOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/all', protectUserOrAdmin, getAllEvents);
router.delete('/:id', protectUserOrAdmin, deleteEvent);
router.put('/:id', protectUserOrAdmin, updateEvent);
router.get('/user', protectUserOrAdmin, getAllEventUserName);
router.post('/create', protectUserOrAdmin, createEvent);
router.get('/user-games', protectUserOrAdmin, getUserGames);
router.get('/history', protectUserOrAdmin, getHistory);

export default router;