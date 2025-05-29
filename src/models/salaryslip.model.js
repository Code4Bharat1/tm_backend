// models/salaryslip.model.js
import mongoose from 'mongoose';

const salarySchema = new mongoose.Schema({
  // Employee Info
  name: {
    type: String,
    required: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  designation: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  payPeriod: {
    type: String,
    required: true
  },
  payDate: {
    type: Date,
    required: true
  },
  
  // Company Info
  companyName: {
    type: String,
    required: true,
    default: "Nextcore Alliance"
  },
  
  // Earnings
  basicSalary: {
    type: Number,
    required: true,
    default: 0
  },
  hra: {
    type: Number,
    default: 0
  },
  conveyance: {
    type: Number,
    default: 0
  },
  medical: {
    type: Number,
    default: 0
  },
  specialAllowance: {
    type: Number,
    default: 0
  },
  other: {
    type: Number,
    default: 0
  },
  
  // Deductions
  epf: {
    type: Number,
    default: 0
  },
  healthInsurance: {
    type: Number,
    default: 0
  },
  professionalTax: {
    type: Number,
    default: 0
  },
  
  // Reimbursements
  mobileBill: {
    type: Number,
    default: 0
  },
  travel: {
    type: Number,
    default: 0
  },
  food: {
    type: Number,
    default: 0
  },
  
  // Calculated Fields (virtual or computed)
  grossSalary: {
    type: Number,
    default: 0
  },
  totalDeductions: {
    type: Number,
    default: 0
  },
  totalReimbursements: {
    type: Number,
    default: 0
  },
  netPayable: {
    type: Number,
    default: 0
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to calculate totals
salarySchema.pre('save', function(next) {
  // Calculate gross salary
  this.grossSalary = (this.basicSalary || 0) + 
                     (this.hra || 0) + 
                     (this.conveyance || 0) + 
                     (this.medical || 0) + 
                     (this.specialAllowance || 0) + 
                     (this.other || 0);
  
  // Calculate total deductions
  this.totalDeductions = (this.epf || 0) + 
                         (this.healthInsurance || 0) + 
                         (this.professionalTax || 0);
  
  // Calculate total reimbursements
  this.totalReimbursements = (this.mobileBill || 0) + 
                             (this.travel || 0) + 
                             (this.food || 0);
  
  // Calculate net payable
  this.netPayable = this.grossSalary - this.totalDeductions + this.totalReimbursements;
  
  // Update timestamp
  this.updatedAt = Date.now();
  next();
});

// Virtual for formatted currency display
salarySchema.virtual('formattedNetPayable').get(function() {
  return `Rs. ${this.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
});

// Ensure virtual fields are serialized
salarySchema.set('toJSON', { virtuals: true });

export const Salary = mongoose.model('Salary', salarySchema);