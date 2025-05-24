import express from "express";
import { protect, protectAdmin } from "../middleware/authMiddleware.js";
import {
  generateWeeklyScore,
  getAllWeeklyScores,
  getIndividualWeeklyScore,
  getIndividualMonthlyScore,
  getIndividualYearlyScore,
  getWeeklyScore,
  updateBehaviourScore,
} from "../controller/performance.controller.js";

const router = express.Router();

// Admin routes
router.get("/generateWeeklyPerformance", protectAdmin, generateWeeklyScore);
router.put("/updateBehaviourScore/:id", protectAdmin, updateBehaviourScore);
router.get("/getWeeklyScore", protectAdmin, getWeeklyScore);
router.get("/getAllWeeklyScores", protectAdmin, getAllWeeklyScores);

// Individual user routes
router.get("/getIndividualWeeklyScore", protect, getIndividualWeeklyScore);
router.get("/getIndividualMonthlyScore", protect, getIndividualMonthlyScore);
router.get("/getIndividualYearlyScore", protect, getIndividualYearlyScore);

export default router;
