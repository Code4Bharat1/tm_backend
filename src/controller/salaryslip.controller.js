// controller/salaryslip.controller.js
import { Salary } from '../models/salaryslip.model.js';

// Create and store salary data
const createSalaryRecord = async (req, res) => {
  try {
    const {
      name,
      employeeId,
      designation,
      department,
      email,
      phone,
      payPeriod,
      payDate,
      companyName,
      // Earnings
      basicSalary,
      hra,
      conveyance,
      medical,
      specialAllowance,
      other,
      // Deductions
      epf,
      healthInsurance,
      professionalTax,
      // Reimbursements
      mobileBill,
      travel,
      food
    } = req.body;

    // Validate required fields
    if (!name || !employeeId || !designation || !department || !email || !phone || !payPeriod || !payDate) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Check if employee ID already exists
    const existingEmployee = await Salary.findOne({ employeeId });
    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }

    // Create new salary record
    const newSalary = new Salary({
      name,
      employeeId,
      designation,
      department,
      email,
      phone,
      payPeriod,
      payDate,
      companyName: companyName || "Nextcore Alliance",
      // Earnings
      basicSalary: basicSalary || 0,
      hra: hra || 0,
      conveyance: conveyance || 0,
      medical: medical || 0,
      specialAllowance: specialAllowance || 0,
      other: other || 0,
      // Deductions
      epf: epf || 0,
      healthInsurance: healthInsurance || 0,
      professionalTax: professionalTax || 0,
      // Reimbursements
      mobileBill: mobileBill || 0,
      travel: travel || 0,
      food: food || 0
    });

    // Save to database (calculations will be done in pre-save middleware)
    const savedSalary = await newSalary.save();

    res.status(201).json({
      success: true,
      message: 'Salary record created successfully',
      data: savedSalary
    });
  } catch (error) {
    console.error('Error creating salary record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create salary record',
      error: error.message
    });
  }
};

// Update salary record
const updateSalaryRecord = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const updateData = req.body;

    // Find and update the salary record
    const updatedSalary = await Salary.findOneAndUpdate(
      { employeeId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedSalary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Salary record updated successfully',
      data: updatedSalary
    });
  } catch (error) {
    console.error('Error updating salary record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update salary record',
      error: error.message
    });
  }
};

// Fetch salary data by employee ID
const getSalaryRecord = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Find salary record by employee ID
    const salaryRecord = await Salary.findOne({ employeeId });

    if (!salaryRecord) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: salaryRecord
    });
  } catch (error) {
    console.error('Error fetching salary record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary record',
      error: error.message
    });
  }
};

// Get all salary records (for admin purposes)
const getAllSalaryRecords = async (req, res) => {
  try {
    const { page = 1, limit = 10, payPeriod, department } = req.query;
    
    // Build filter object
    const filter = {};
    if (payPeriod) filter.payPeriod = payPeriod;
    if (department) filter.department = department;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch records with pagination and filtering
    const salaryRecords = await Salary.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalRecords = await Salary.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: salaryRecords.length,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: parseInt(page),
      data: salaryRecords
    });
  } catch (error) {
    console.error('Error fetching all salary records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary records',
      error: error.message
    });
  }
};

// Delete salary record
const deleteSalaryRecord = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const deletedSalary = await Salary.findOneAndDelete({ employeeId });

    if (!deletedSalary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Salary record deleted successfully',
      data: deletedSalary
    });
  } catch (error) {
    console.error('Error deleting salary record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete salary record',
      error: error.message
    });
  }
};

// Get salary statistics
const getSalaryStatistics = async (req, res) => {
  try {
    const totalEmployees = await Salary.countDocuments();
    
    const salaryStats = await Salary.aggregate([
      {
        $group: {
          _id: null,
          avgGrossSalary: { $avg: "$grossSalary" },
          maxGrossSalary: { $max: "$grossSalary" },
          minGrossSalary: { $min: "$grossSalary" },
          totalPayroll: { $sum: "$netPayable" }
        }
      }
    ]);

    const departmentStats = await Salary.aggregate([
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
          avgSalary: { $avg: "$grossSalary" }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        salaryStatistics: salaryStats[0] || {},
        departmentWiseStats: departmentStats
      }
    });
  } catch (error) {
    console.error('Error fetching salary statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary statistics',
      error: error.message
    });
  }
};

export {
  createSalaryRecord,
  updateSalaryRecord,
  getSalaryRecord,
  getAllSalaryRecords,
  deleteSalaryRecord,
  getSalaryStatistics
};