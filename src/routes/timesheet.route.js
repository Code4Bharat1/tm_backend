import express from "express";
import {
  storeTimesheet,
  getTimesheetsbyDate,
  updateTimesheet,
  getUserTimesheetsByCompany,
  getApprovers,
  getTeamTimesheet,
  addVoiceRecordingToTimesheet,
  getTimesheet,
  createTimesheetWithVoice,
} from "../controller/timesheet.controller.js";
import { protect, protectAdmin, protectUserOrAdmin } from "../middleware/authMiddleware.js";
import multer from "multer";

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

const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Create a new Timesheet with a voice recording
 */
router.post(
  '/',
  upload.single('file'),
  protect,
  createTimesheetWithVoice
);


/**
 * Update an existing Timesheet with a voice recording
 */
router.patch(
  '/:date/changeVoice',
  upload.single('file'),
  protect,
  addVoiceRecordingToTimesheet
);


/**
 * Retrieve a Timesheet by its ID
 */
router.get('/getVoice/:date',protectUserOrAdmin, getTimesheet);

export default router;
