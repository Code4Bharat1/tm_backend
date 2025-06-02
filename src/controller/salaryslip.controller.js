import  Salary from '../models/salaryslip.model.js';

// Create and store salary data
const createSalaryRecord = async (req, res) => {
  try {
    // Extract all fields
    const payload = req.body;
    
    // Validate required fields
    const requiredFields = [
      'name', 'employeeId', 'designation', 'department', 
      'email', 'phone', 'payPeriod', 'payDate', 'basicSalary'
    ];
    
    const missingFields = requiredFields.filter(field => !payload[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Check if employee ID already exists
    const existingEmployee = await Salary.findOne({ employeeId: payload.employeeId });
    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }

    // Calculate earnings total (gross salary)
    const earningsTotal = [
      payload.basicSalary || 0,
      payload.hra || 0,
      payload.conveyance || 0,
      payload.medical || 0,
      payload.specialAllowance || 0,
      payload.other || 0
    ].reduce((sum, val) => sum + val, 0);

    // Calculate EPF amount
    const epfAmount = payload.epfPercentage 
      ? (earningsTotal * payload.epfPercentage) / 100 
      : 0;

    // Create new salary record
    const newSalary = new Salary({
      ...payload,
      companyName: payload.companyName || "Nextcore Alliance",
      epf: epfAmount,
      grossSalary: earningsTotal,
      totalDeductions: epfAmount + (payload.healthInsurance || 0) + (payload.professionalTax || 0),
      totalReimbursements: (payload.mobileBill || 0) + (payload.travel || 0) + (payload.food || 0)
    });

    // Calculate net payable
    newSalary.netPayable = newSalary.grossSalary - newSalary.totalDeductions + newSalary.totalReimbursements;

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

// Update salary record
const updateSalaryRecord = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const updateData = req.body;

    // If epfPercentage is being updated, we need to recalculate EPF amount
    if (updateData.epfPercentage !== undefined) {
      // Get current earnings data
      const currentRecord = await Salary.findOne({ employeeId });
      if (!currentRecord) {
        return res.status(404).json({
          success: false,
          message: 'Salary record not found'
        });
      }

      // Calculate earnings total (gross salary)
      const earningsTotal = (updateData.basicSalary || currentRecord.basicSalary) + 
                           (updateData.hra || currentRecord.hra) + 
                           (updateData.conveyance || currentRecord.conveyance) + 
                           (updateData.medical || currentRecord.medical) + 
                           (updateData.specialAllowance || currentRecord.specialAllowance) + 
                           (updateData.other || currentRecord.other);

      // Calculate new EPF amount
      updateData.epf = earningsTotal * updateData.epfPercentage / 100;
    }

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


// adjust path as needed

const getSalaryByEmployeeAndDate = async (req, res) => {
  try {
    const { employeeId, date } = req.body; // date = "May, 2025"

    if (!employeeId || !date) {
      return res.status(400).json({
        success: false,
        message: 'employeeId and date are required in the format: May, 2025'
      });
    }

    // Convert input date string to lowercase for consistent matching
    const formattedInputDate = date.trim().toLowerCase();

    // Find matching record
    const salaryRecord = await Salary.findOne({
      employeeId,
      $expr: {
        $eq: [
          {
            $dateToString: { format: "%B, %Y", date: "$payDate" } // Converts to "May, 2025"
          },
          formattedInputDate.charAt(0).toUpperCase() + formattedInputDate.slice(1) // Ensures "may, 2025" -> "May, 2025"
        ]
      }
    });

    if (!salaryRecord) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found for the given employeeId and date'
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




export {
  createSalaryRecord,
  updateSalaryRecord,
  getSalaryRecord,
  getAllSalaryRecords,
  deleteSalaryRecord,
  getSalaryStatistics,
  getSalaryByEmployeeAndDate
};