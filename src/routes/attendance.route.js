import express from "express";
import {
  punchOutController,
  punchInController,
  getTodayAttendance,
} from "../controller/attendance.controller.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
// Route to punch in
router.post(
  "/punch-in",
  protect,
  punchInController
);
router.post(
  "/punch-out",
  protect,
  punchOutController
);
router.get(
  "/today",
  protect,
  getTodayAttendance
);

export default router;
