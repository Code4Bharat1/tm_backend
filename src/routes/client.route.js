import express from 'express';
import { registerClient, getAllClients } from '../controller/client.controller.js';
import { protectAdmin } from '../middleware/authMiddleware.js';
const router = express.Router();


router.post('/register', protectAdmin, registerClient);
router.get('/login', getAllClients);

export default router;