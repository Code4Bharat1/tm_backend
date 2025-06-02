import express from 'express';
import { registerClient, getAllClients, loginClient,updateClient, deleteClient, resetClientPassword } from '../controller/client.controller.js';
import { protectAdmin } from '../middleware/authMiddleware.js';
const router = express.Router();


router.post('/register', protectAdmin, registerClient);
router.get('/getAllClients', protectAdmin, getAllClients);
router.post('/login', loginClient);
router.put("/update/:id", protectAdmin, updateClient);
router.delete("/delete/:id", protectAdmin, deleteClient);
router.post("/:id/reset-password", protectAdmin, resetClientPassword);
export default router;