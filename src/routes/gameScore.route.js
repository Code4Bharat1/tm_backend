import express from 'express';
import { submitScore, getScores } from '../controller/gameScore.controller.js';
const router = express.Router();

router.post('/submit',submitScore);
router.get('/list', getScores);

export default router;