import express from 'express';
import { submitScore, getScores } from '../controller/gameScore.controller.js';
import {protect} from "../middleware/authMiddleware.js"
const router = express.Router();

router.post('/submit',submitScore);
router.get('/list', protect, getScores);

export default router;