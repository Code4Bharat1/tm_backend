import express from 'express'
import { protect, protectClient } from '../middleware/authMiddleware.js';
import { fetchTicket, fetchTicketByClient, getAllUserEmails, raiseTicket, raiseTicketByClient, updateTicket } from '../controller/raiseTicket.controller.js';

const router = express.Router();
router.post('/raiseTicket', protect, raiseTicket);
router.get('/fetchTicket', protect, fetchTicket);
router.patch('/updateTicket', protect, updateTicket);
router.get('/getAllUsersEmail', protect, getAllUserEmails)

router.post('/client/raiseTicket', protectClient, raiseTicketByClient)
router.get('/client/fetchTicket', protectClient, fetchTicketByClient)

export default router;