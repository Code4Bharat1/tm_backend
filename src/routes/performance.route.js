import express from "express";
import { protect, protectAdmin } from "../middleware/authMiddleware.js";
import { generateWeeklyScore, getAllWeeklyScores, updateBehaviourScore } from "../controller/performance.controller.js";

const router = express.Router();

router.get('/generateWeeklyPerformance', protectAdmin, generateWeeklyScore)
router.put('/updateBehaviourScore/:id', protectAdmin, updateBehaviourScore)

export default router;
