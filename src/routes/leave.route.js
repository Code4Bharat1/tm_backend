import express from "express";
import multer from "multer";
import {
    applyLeave,
    getAllLeaves,
    updateLeaveStatus,
} from "../controller/leave.controller.js";

const router = express.Router();

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) =>
        cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Routes
router.post("/apply", upload.single("attachment"), applyLeave);
router.get("/all", getAllLeaves);
router.put("/status/:leaveId", updateLeaveStatus);

export default router;
