import User from "../models/user.model.js";

import Salary from "../models/salary.model.js";

export const getSalarySlip = async (req, res) => {
  try {
    // 1. Get authenticated user from request
    const user = req.user;

    // 2. Get month from query parameters
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Month parameter is required (YYYY-MM format)",
      });
    }

    // 3. Find salary data for this employee and month
    const salaryData = await Salary.findOne({
      employee: user._id,
      payPeriod: month,
    }).populate("employee", "name employeeId department designation company");

    if (!salaryData) {
      return res.status(404).json({
        success: false,
        message: "Salary not generated for selected month",
      });
    }

    // 4. Return salary data
    res.status(200).json({
      success: true,
      data: {
        ...salaryData.toObject(),
        name: salaryData.employee.name,
        employeeId: salaryData.employee.employeeId,
        department: salaryData.employee.department,
        designation: salaryData.employee.designation,
        companyName: salaryData.employee.company || "Nextcore Alliance",
      },
    });
  } catch (error) {
    console.error("Error fetching salary slip:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const generateSalaries = async (req, res) => {
  try {
    // 1. Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to perform this action",
      });
    }

    // 2. Get month from request body
    const { month } = req.body;

    // 3. Validate month
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "Invalid month format. Use YYYY-MM",
      });
    }

    // 4. Get all active employees
    const employees = await User.find({ status: "active" });

    // 5. Generate salaries
    const salaryPromises = employees.map(async (employee) => {
      // Calculate salary components based on employee data
      const salary = calculateSalary(employee);

      return Salary.findOneAndUpdate(
        { employee: employee._id, payPeriod: month },
        { ...salary, employee: employee._id, payPeriod: month },
        { upsert: true, new: true },
      );
    });

    await Promise.all(salaryPromises);

    res.status(200).json({
      success: true,
      message: `Salaries generated for ${employees.length} employees for ${month}`,
    });
  } catch (error) {
    console.error("Error generating salaries:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Helper function to calculate salary components
function calculateSalary(employee) {
  // Example calculation logic - replace with your actual formula
  const base = employee.baseSalary || 30000;

  const basic = base * 0.5;
  const hra = base * 0.3;
  const conveyance = 1600;
  const medical = 1250;
  const specialAllowance = base - (basic + hra + conveyance + medical);

  const epf = basic * 0.12;
  const healthInsurance = 500;
  const professionalTax = 200;

  const mobileBill = 500;
  const travel = 1000;
  const food = 1000;

  const grossSalary = basic + hra + conveyance + medical + specialAllowance;
  const totalDeductions = epf + healthInsurance + professionalTax;
  const totalReimbursements = mobileBill + travel + food;
  const netPayable = grossSalary - totalDeductions + totalReimbursements;

  return {
    basicSalary: basic,
    hra: hra,
    conveyance: conveyance,
    medical: medical,
    specialAllowance: specialAllowance,
    other: 0,
    epf: epf,
    healthInsurance: healthInsurance,
    professionalTax: professionalTax,
    mobileBill: mobileBill,
    travel: travel,
    food: food,
    grossSalary: grossSalary,
    totalDeductions: totalDeductions,
    totalReimbursements: totalReimbursements,
    netPayable: netPayable,
  };
}
