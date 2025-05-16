import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createTaskAssignment, getAllUserEmails, getTaskAssignments } from '../controller/task.controller.js';

const router = express.Router();

router.post('/createTask', protect, createTaskAssignment);
router.get('/getTasks', protect, getTaskAssignments);
router.get('/getAllUserEmails', protect, getAllUserEmails)
export default router;