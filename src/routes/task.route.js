// import express from "express";
// import { protect, protectAdmin } from "../middleware/authMiddleware.js";
// import { upload } from "../middleware/multer.middleware.js";
// import {
//   createTaskAssignment,
//   getAllUserEmails,
//   getOngoingProjects,
//   getTaskAssignments,
//   closeTask,
// } from "../controller/task.controller.js";

// const router = express.Router();

// router.post("/createTask", protectAdmin, createTaskAssignment);
// router.get("/getTasks", protect, getTaskAssignments);
// router.get("/getAllUserEmails", protect, getAllUserEmails);
// router.get("/getOngoingProjects", protectAdmin, getOngoingProjects);

// // New route to close a task with optional file upload
// router.post("/:taskId/close", protect, upload.single("attachment"), closeTask);

// export default router;
import express from "express";
import { protect, protectAdmin } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multer.middleware.js";
import {
  createTaskAssignment,
  getAllUserEmails,
  getOngoingProjects,
  getTaskAssignments,
  closeTask,
  getTaskStatistics,
  getAdminTaskAssignments,
  getUserTaskAssignments,
} from "../controller/task.controller.js";

const router = express.Router();

// Task creation (Admin only)
router.post("/createTask", protectAdmin, createTaskAssignment);

// Get all tasks with filtering options
router.get("/getTasks", protect, getTaskAssignments);

// Get task statistics with time filtering
router.get("/getTaskStatistics", protectAdmin, getTaskStatistics);

// Get all user emails for task assignment
router.get("/getAllUserEmails", protect, getAllUserEmails);

// Get ongoing projects with time filtering
router.get("/getOngoingProjects", protectAdmin, getOngoingProjects);

// Close a task with optional file upload
router.post("/:taskId/close", protect, upload.single("attachment"), closeTask);

router.get("/projects", protectAdmin, getAdminTaskAssignments);

router.get("/projectsuser", protect, getUserTaskAssignments);

export default router;