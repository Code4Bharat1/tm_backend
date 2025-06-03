import express from 'express';
import { createEvent, getAllEvents, deleteEvent, updateEvent } from '../controller/event.controller.js';

const router = express.Router();

router.post('/create', createEvent);
router.get('/all', getAllEvents);
router.delete('/:id', deleteEvent);
router.put('/:id', updateEvent);

export default router;