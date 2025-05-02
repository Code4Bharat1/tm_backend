import express from 'express';
import { punchOutController, punchInController } from '../controller/attendance.controller.js';
const router = express.Router();
// Route to punch in
router.post('/punch-in', punchInController);
router.post('/punch-out', punchOutController);

export default router;