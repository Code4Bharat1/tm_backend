
import express from 'express'
import { getAllTeammembersCompany } from '../controller/team.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get("/team" , protect, getAllTeammembersCompany)

export default router;