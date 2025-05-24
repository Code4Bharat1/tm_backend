import express from 'express';
import { protect, protectAdmin } from '../middleware/authMiddleware.js';
import { createTaskAssignment, getAllUserEmails, getOngoingProjects, getTaskAssignments } from '../controller/task.controller.js';

const router = express.Router();

router.post('/createTask', protectAdmin, createTaskAssignment);
router.get('/getTasks', protect, getTaskAssignments);
router.get('/getAllUserEmails', protect, getAllUserEmails)
router.get('/getOngoingProjects', protectAdmin, getOngoingProjects)
export default router;