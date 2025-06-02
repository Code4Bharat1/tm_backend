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
  getUnassignedEmployeesForProject,
  updateTaskTagMembers,
  removeMemberFromTask,
  getAllClientsForTask, // New import
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

// Get all clients for task assignment (Admin only)
router.get("/getAllClients", protectAdmin, getAllClientsForTask);

// Get ongoing projects with time filtering
router.get("/getOngoingProjects", protectAdmin, getOngoingProjects);

// Close a task with optional file upload
router.post("/:taskId/close", protect, upload.none(), closeTask);

router.get("/projects", protectAdmin, getAdminTaskAssignments);

router.get("/projectsuser", protect, getUserTaskAssignments);

router.get("/getUnassignedUsers", protect, getUnassignedEmployeesForProject);

router.patch("/updateTagMembers/:taskId", protect, updateTaskTagMembers);

router.put("/:taskId/removeMember", removeMemberFromTask);

export default router;
