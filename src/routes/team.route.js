
import express from 'express'
import { createBucketAssignment, getAllTeammembersCompany } from '../controller/team.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post("/create", protect, createBucketAssignment);
router.get("/team" , protect, getAllTeammembersCompany);

export default router;