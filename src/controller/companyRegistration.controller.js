import { CompanyRegistration } from '../models/companyregistration.model.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// Register a new company
export const registerCompany = async (req, res) => {
  try {
    const {
      companyInfo,
      adminInfo,
      planPreferences,
      termsAccepted
    } = req.body;

    if (!termsAccepted) {
      return res.status(400).json({ message: "You must accept the terms and conditions." });
    }

    // Check if admin email already exists
    const existing = await CompanyRegistration.findOne({ 'adminInfo.officialEmail': adminInfo.officialEmail });
    if (existing) {
      return res.status(400).json({ message: "Admin email already registered." });
    }

    const newCompany = new CompanyRegistration({
      companyInfo,
      adminInfo,
      planPreferences,
      termsAccepted
    });

    await newCompany.save();

    res.status(201).json({ message: 'Company registered successfully', companyId: newCompany._id });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Login admin
export const loginCompanyAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const company = await CompanyRegistration.findOne({ 'adminInfo.officialEmail': email });
    if (!company) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    const isMatch = await company.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: company._id, email: company.adminInfo.officialEmail },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      companyId: company._id
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all companies (admin use)
export const getAllCompanies = async (req, res) => {
  try {
    const companies = await CompanyRegistration.find().sort({ createdAt: -1 });
    res.status(200).json(companies);
  } catch (err) {
    console.error('Get Companies Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a company by ID
export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    await CompanyRegistration.findByIdAndDelete(id);
    res.status(200).json({ message: 'Company deleted successfully' });
  } catch (err) {
    console.error('Delete Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
