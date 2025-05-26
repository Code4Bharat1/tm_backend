import express from "express";
import multer from "multer";
import {
    applyLeave,
    getAllLeaves,
    updateLeaveStatus,
    getCompanyLeaves,
    getLeaveDetailsById,
    getApprovers,
    getSingleLeave,
    getTeamLeaves
} from "../controller/leave.controller.js";
import { protect, protectAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) =>
        cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Routes
router.post("/apply",protect, upload.single("attachment"), applyLeave);
router.get('/approvers', protect, getApprovers);
router.get("/userLeave",protect, getAllLeaves);
router.get("/admin/company-leaves",protectAdmin, getCompanyLeaves);
router.get("/user/team-leaves", protect, getTeamLeaves);
router.get("/admin/single-leave/:id",protectAdmin, getSingleLeave);
router.get('/admin/leave/:leaveId', protectAdmin, getLeaveDetailsById);
router.put('/admin/update-status/:leaveId', protectAdmin, updateLeaveStatus);

export default router;
