import express from "express";
import { protect, protectAdmin } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multer.middleware.js";
import {
  createTaskAssignment,
  getAllUserEmails,
  getOngoingProjects,
  getTaskAssignments,
  closeTask,
} from "../controller/task.controller.js";

const router = express.Router();

router.post("/createTask", protectAdmin, createTaskAssignment);
router.get("/getTasks", protect, getTaskAssignments);
router.get("/getAllUserEmails", protect, getAllUserEmails);
router.get("/getOngoingProjects", protectAdmin, getOngoingProjects);

// New route to close a task with optional file upload
router.post("/:taskId/close", protect, upload.single("attachment"), closeTask);

export default router;
