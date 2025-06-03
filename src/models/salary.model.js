// models/salary.model.js
import mongoose from "mongoose";

const salarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    payslipMonth: {
      type: String,
      required: true,
      // Format: "YYYY-MM"
    },
    // Earnings
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    houseRentAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },
    conveyance: {
      type: Number,
      default: 0,
      min: 0,
    },
    medical: {
      type: Number,
      default: 0,
      min: 0,
    },
    specialAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },
    reimbursements: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Deductions
    epf: {
      type: Number,
      default: 0,
      min: 0,
    },
    healthInsurance: {
      type: Number,
      default: 0,
      min: 0,
    },
    professionalTax: {
      type: Number,
      default: 0,
      min: 0,
    },
    tds: {
      type: Number,
      default: 0,
      min: 0,
    },
    absentDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Calculated fields
    totalEarnings: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDeductions: {
      type: Number,
      required: true,
      min: 0,
    },
    netSalary: {
      type: Number,
      required: true,
    },
    // Status
    status: {
      type: String,
      enum: ["draft", "processed", "paid"],
      default: "draft",
    },
    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Create compound index to ensure unique salary per user per month
salarySchema.index(
  { userId: 1, companyId: 1, payslipMonth: 1 },
  { unique: true },
);

// Index for efficient querying
salarySchema.index({ companyId: 1, payslipMonth: 1 });
salarySchema.index({ userId: 1, payslipMonth: 1 });

const Salary = mongoose.model("Salary", salarySchema);

export default Salary;
