
import {Salary} from '../models/salaryslip.model.js'

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
      salary
    } = req.body;

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
      companyName,
      salary
    });

    // Save to database
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
    const salaryRecords = await Salary.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: salaryRecords.length,
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

export  {
  createSalaryRecord,
  getSalaryRecord,
  getAllSalaryRecords
};