import express from 'express';
import { registerClient, getAllClients, loginClient } from '../controller/client.controller.js';
import { protectAdmin } from '../middleware/authMiddleware.js';
const router = express.Router();


router.post('/register', protectAdmin, registerClient);
router.get('/getAllClients', protectAdmin, getAllClients);
router.post('/login', loginClient)
export default router;