// models/Salary.js
import  mongoose from 'mongoose';

const salarySchema = new mongoose.Schema({
  // Employee Info
  name: {
    type: String,
    required: true
  },
  employeeId: {
    type: String,
    required: true
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
    required: true
  },
  
  // Salary
  salary: {
    type: Number,
    required: true
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

// Update the updatedAt field before saving
salarySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});



export const Salary = mongoose.model('Salary', salarySchema);

