import express from 'express';
import { createMeeting, getMeetings ,getMeetingForParticipant} from '../controller/meeting.controller.js';
import {roleMiddleware} from '../middleware/roleMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';


const router = express.Router();

// Create meeting route (accessible to admin, TL, manager)
router.post(
  '/create',protect,
//   roleMiddleware(['Admin', 'Teamleader', 'Manager','Hr']),
  createMeeting
);

// Get all meetings route
router.get('/',  getMeetings);
router.post('/participant', getMeetingForParticipant);

export default router;