import express from 'express';
import { submitScore, getScores } from '../controller/gameScore.controller.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.post('/submit',protect, submitScore);
router.get('/list', getScores);

export default router;