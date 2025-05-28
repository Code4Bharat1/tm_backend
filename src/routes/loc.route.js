import express from 'express';
import { protectAdmin } from '../middleware/authMiddleware.js';
import { getAllLOCs } from '../controller/loc.controller.js';

const router = express.Router();

router.get('/getloc', protectAdmin, getAllLOCs);

export default router;