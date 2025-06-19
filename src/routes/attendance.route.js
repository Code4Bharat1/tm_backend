import express from "express";
import {
  editAttendanceTimeController,
  getAllAttendance,
  getParticularUserAttendance,
  getPositionWiseAttendance,
  getTodayAttendance,
  punchInController,
  punchOutController,
} from "../controller/attendance.controller.js";
import { protect, protectAdmin } from "../middleware/authMiddleware.js";
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
router.get(
  "/punchHistory",
  protect,
  getParticularUserAttendance
);
router.get(
  "/allAttendance",
  protectAdmin,
  getAllAttendance
);
router.get(
  "/allAttendanceUser",
  protect,
  getAllAttendance
);

router.get(
  "/teamAttendance",
  protect,
  getPositionWiseAttendance
);
router.patch(
  "/edit-time/:attendanceId",
  protectAdmin,
  editAttendanceTimeController
);

export default router;
