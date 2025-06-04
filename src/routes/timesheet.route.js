import express from "express";
import {
  storeTimesheet,
  getTimesheetsbyDate,
  updateTimesheet,
  getUserTimesheetsByCompany,
  getApprovers,
  getTeamTimesheet,
} from "../controller/timesheet.controller.js";
import { protect, protectAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();
// Route to store timesheet
router.post(
  "/store",
  protect,
  storeTimesheet
);
// Example endpoint in the backend to fetch timesheet by date
router.get(
  "/:date",
  protect,
  getTimesheetsbyDate
);
router.put(
  "/:date",
  protect,
  updateTimesheet
);

router.get('/admin/timesheets', protectAdmin, getUserTimesheetsByCompany);
router.get('/user/timesheets', protect, getTeamTimesheet);
router.get('/user/approvers', protect, getApprovers);
// Route to get timesheet
// router.get('/get', (req, res) => {
//     // Logic to get timesheet
//     res.send('Get timesheet');
// });

export default router;
