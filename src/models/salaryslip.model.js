import mongoose from 'mongoose';

const salarySchema = new mongoose.Schema({
  name: { type: String, required: true },
  employeeId: { type: String, required: true, unique: true },
  designation: { type: String, required: true },
  department: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  payPeriod: { type: String, required: true },
  payDate: { type: Date, required: true },
  companyName: { type: String, default: "Nextcore Alliance" },
  
  // Earnings
  basicSalary: { type: Number, required: true, min: 0 },
  hra: { type: Number, default: 0, min: 0 },
  conveyance: { type: Number, default: 0, min: 0 },
  medical: { type: Number, default: 0, min: 0 },
  specialAllowance: { type: Number, default: 0, min: 0 },
  other: { type: Number, default: 0, min: 0 },
  
  // Deductions
  epf: { type: Number, default: 0, min: 0 },
  epfPercentage: { type: Number, default: 0, min: 0, max: 100 },
  healthInsurance: { type: Number, default: 0, min: 0 },
  professionalTax: { type: Number, default: 0, min: 0 },
  
  // Reimbursements
  mobileBill: { type: Number, default: 0, min: 0 },
  travel: { type: Number, default: 0, min: 0 },
  food: { type: Number, default: 0, min: 0 },
  
  // Calculated fields
  grossSalary: { type: Number, default: 0, min: 0 },
  totalDeductions: { type: Number, default: 0, min: 0 },
  totalReimbursements: { type: Number, default: 0, min: 0 },
  netPayable: { type: Number, default: 0 }
}, {
  timestamps: true
});

const Salary = mongoose.model('Salary', salarySchema);

export default Salary;