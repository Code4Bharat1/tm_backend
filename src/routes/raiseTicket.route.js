import express from 'express'
import { protect } from '../middleware/authMiddleware.js';
import { fetchTicket, getAllUserEmails, raiseTicket, updateTicket } from '../controller/raiseTicket.controller.js';

const router = express.Router();
router.post('/raiseTicket', protect, raiseTicket);
router.get('/fetchTicket', protect, fetchTicket);
router.patch('/updateTicket', protect, updateTicket);
router.get('/getAllUsersEmail', protect, getAllUserEmails)
export default router;