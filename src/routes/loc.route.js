import express from 'express';
import { protectAdmin } from '../middleware/authMiddleware.js';
import { getAllLOCs, getAllUserName, createLOC } from '../controller/loc.controller.js';

const router = express.Router();

router.get('/getloc', protectAdmin, getAllLOCs);
router.get('/getusers', protectAdmin, getAllUserName);
router.post("/createloc",protectAdmin, createLOC);

export default router;