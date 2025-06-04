// routes/salaryRoutes.js
import express from "express";
import {
  createSalary,
  checkExistingSalary,
  getEmails,
  getEmployeesWithBankDetails, // New import
  getSalaryDetails,
  getAllSalaries, // New import
  updateSalary,
  updateSalaryStatus, // New import
  deleteSalary,
} from "../controller/salary.controller.js";
import { protect, protectAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Route to create salary
router.post("/createSalary", protectAdmin, createSalary);

// Route to check if salary exists for a month
router.get("/checkExisting", protectAdmin, checkExistingSalary);

// Route to get all users (for dropdown)
router.get("/getEmails", protectAdmin, getEmails);

// Route to get salary details
router.get("/getSalaryDetails", protect, getSalaryDetails);

// Route to update salary
router.put("/updateSalary/:id", protectAdmin, updateSalary);

// Route to delete salary
router.delete("/deleteSalary/:id", protectAdmin, deleteSalary);

router.get("/getAllSalaries", protectAdmin, getAllSalaries);

// Route to get employees with bank details
router.get(
  "/getEmployeesWithBankDetails",
  protectAdmin,
  getEmployeesWithBankDetails,
);

// Route to update salary status
router.put("/updateStatus/:id", protectAdmin, updateSalaryStatus);
export default router;
