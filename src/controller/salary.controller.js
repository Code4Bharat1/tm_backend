// controllers/salaryController.js
import Salary from "../models/salary.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

export const createSalary = async (req, res) => {
  try {
    const { userId } = req.query;
    const { companyId } = req.user;
    const {
      basicSalary,
      houseRentAllowance,
      conveyance,
      medical,
      specialAllowance,
      epf,
      healthInsurance,
      professionalTax,
      tds,
      absentDeduction,
      reimbursements,
      payslipMonth,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Check if salary already exists for this user and month
    const existingSalary = await Salary.findOne({
      userId,
      companyId,
      payslipMonth,
    });

    if (existingSalary) {
      return res.status(400).json({
        message:
          "Salary details already exist for this month. Please select a different month or update the existing record.",
      });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate totals
    const totalEarnings =
      Number(basicSalary) +
      Number(houseRentAllowance) +
      Number(conveyance) +
      Number(medical) +
      Number(specialAllowance) +
      Number(reimbursements);

    const totalDeductions =
      Number(epf) +
      Number(healthInsurance) +
      Number(professionalTax) +
      Number(tds) +
      Number(absentDeduction);

    const netSalary = totalEarnings - totalDeductions;

    const newSalary = new Salary({
      userId,
      companyId,
      basicSalary: Number(basicSalary),
      houseRentAllowance: Number(houseRentAllowance),
      conveyance: Number(conveyance),
      medical: Number(medical),
      specialAllowance: Number(specialAllowance),
      epf: Number(epf),
      healthInsurance: Number(healthInsurance),
      professionalTax: Number(professionalTax),
      tds: Number(tds),
      absentDeduction: Number(absentDeduction),
      reimbursements: Number(reimbursements),
      totalEarnings,
      totalDeductions,
      netSalary,
      payslipMonth,
    });

    await newSalary.save();

    res.status(201).json({
      message: "Salary created successfully",
      data: newSalary,
    });
  } catch (error) {
    console.error("Error creating salary:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const checkExistingSalary = async (req, res) => {
  try {
    const { userId, month } = req.query;
    const { companyId } = req.user;

    if (!userId || !month) {
      return res
        .status(400)
        .json({ message: "User ID and month are required" });
    }

    const existingSalary = await Salary.findOne({
      userId,
      companyId,
      payslipMonth: month,
    });

    res.status(200).json({
      exists: !!existingSalary,
      salary: existingSalary || null,
    });
  } catch (error) {
    console.error("Error checking existing salary:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getEmails = async (req, res) => {
  try {
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const users = await User.find(
      { companyId },
      { firstName: 1, lastName: 1, email: 1, _id: 1 },
    ).sort({ firstName: 1, lastName: 1 });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getSalaryDetails = async (req, res) => {
  try {
    const { month, year } = req.query;
    const { companyId, userId } = req.user;

    // Build query object
    const query = { companyId, userId };

    if(!userId) return res.status(400).json({message: "User id is required"})

    if (month && year) {
      const payslipMonth = `${year}-${month.padStart(2, "0")}`;
      query.payslipMonth = payslipMonth;
    }

    const salaries = await Salary.find(query)
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      data: salaries,
    });
  } catch (error) {
    console.error("Error fetching salary details:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const updateSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    const {
      basicSalary,
      houseRentAllowance,
      conveyance,
      medical,
      specialAllowance,
      epf,
      healthInsurance,
      professionalTax,
      tds,
      absentDeduction,
      reimbursements,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid salary ID format" });
    }

    // Find existing salary
    const existingSalary = await Salary.findOne({ _id: id, companyId });
    if (!existingSalary) {
      return res.status(404).json({ message: "Salary record not found" });
    }

    // Calculate totals
    const totalEarnings =
      Number(basicSalary) +
      Number(houseRentAllowance) +
      Number(conveyance) +
      Number(medical) +
      Number(specialAllowance) +
      Number(reimbursements);

    const totalDeductions =
      Number(epf) +
      Number(healthInsurance) +
      Number(professionalTax) +
      Number(tds) +
      Number(absentDeduction);

    const netSalary = totalEarnings - totalDeductions;

    // Update salary
    const updatedSalary = await Salary.findByIdAndUpdate(
      id,
      {
        basicSalary: Number(basicSalary),
        houseRentAllowance: Number(houseRentAllowance),
        conveyance: Number(conveyance),
        medical: Number(medical),
        specialAllowance: Number(specialAllowance),
        epf: Number(epf),
        healthInsurance: Number(healthInsurance),
        professionalTax: Number(professionalTax),
        tds: Number(tds),
        absentDeduction: Number(absentDeduction),
        reimbursements: Number(reimbursements),
        totalEarnings,
        totalDeductions,
        netSalary,
      },
      { new: true },
    );

    res.status(200).json({
      message: "Salary updated successfully",
      data: updatedSalary,
    });
  } catch (error) {
    console.error("Error updating salary:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const deleteSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid salary ID format" });
    }

    const deletedSalary = await Salary.findOneAndDelete({ _id: id, companyId });

    if (!deletedSalary) {
      return res.status(404).json({ message: "Salary record not found" });
    }

    res.status(200).json({
      message: "Salary deleted successfully",
      data: { id: deletedSalary._id },
    });
  } catch (error) {
    console.error("Error deleting salary:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
