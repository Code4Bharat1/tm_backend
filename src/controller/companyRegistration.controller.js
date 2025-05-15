import { CompanyRegistration } from '../models/companyregistration.model.js';
import Admin from '../models/admin.model.js';
import jwt from 'jsonwebtoken';
import { sendMail } from '../service/nodemailerConfig.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Register a new company
export const registerCompany = async (req, res) => {
  try {
    const { companyInfo, adminInfo, planPreferences, termsAccepted, status } = req.body;

    if (!termsAccepted) {
      return res.status(400).json({ message: 'You must accept the terms and conditions.' });
    }

    // Check if admin email already exists
    const existing = await CompanyRegistration.findOne({
      'adminInfo.officialEmail': adminInfo.officialEmail,
    });
    if (existing) {
      return res.status(400).json({ message: 'Admin email already registered.' });
    }

    const newCompany = new CompanyRegistration({
      companyInfo,
      adminInfo,
      planPreferences,
      termsAccepted,
      status,
    });

    await newCompany.save();
    sendMail(
      adminInfo.officialEmail,
      'Task Manager Credentials',
      `
      Dear Admin,

      Your Task Manager login credentials are as follows:

      Login ID: ${adminInfo.officialEmail}
      Password: test@123

      **Important:** Please log in and change your password immediately for security purposes.

      If you did not request these credentials or have any concerns, contact IT support immediately.

      Best regards,
      Task Manager Support Team
      `,
    );

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
      { expiresIn: '1d' },
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      companyId: company._id,
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
    const totalCompanies = await CompanyRegistration.countDocuments();

    res.status(200).json({
      total: totalCompanies,
      companies,
    });
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

export const getCompaniesByStatus = async (req, res) => {
  try {
    const { status } = req.query; // e.g. ?status=Pending
    if (!['Pending', 'Active', 'Suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const companies = await CompanyRegistration.find({ status });
    res.status(200).json({ success: true, companies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /compnayRegister/:id
export const updateCompanyStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const company = await CompanyRegistration.findById(id);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Update company status
    company.status = status;
    await company.save();

    const { officialEmail, fullName, designation, phoneNumber, password } = company.adminInfo || {};
    const { companyName } = company.companyInfo || {};

    if (!officialEmail || !password) {
      return res.status(400).json({ success: false, message: 'Missing admin info' });
    }

    let emailSubject = '';
    let emailBody = '';

    if (status === 'Active') {
      const existingAdmin = await Admin.findOne({
        $or: [{ email: officialEmail }, { phone: phoneNumber }],
      });

      if (!existingAdmin) {
        const adminData = {
          companyName,
          fullName,
          email: officialEmail,
          password,
          position: designation,
          phone: phoneNumber,
          // userId: company._id // Uncomment if userId is needed
        };

        const newAdmin = new Admin(adminData);
        await newAdmin.save();
      }

      emailSubject = 'Company Registration Approved';
      emailBody = `
        Hi ${fullName},<br/><br/>
        Your company <strong>${companyName}</strong> has been <strong>approved</strong>! 🎉<br/>
        You are now registered as the <strong>primary admin</strong>.<br/><br/>
        You can now login with:<br/>
        <strong>Email:</strong> ${officialEmail}<br/>
        <strong>Password:</strong> ${password}<br/><br/>
        Welcome aboard!<br/>
        - The Team
      `;
    } else if (status === 'Suspended') {
      emailSubject = 'Company Registration Rejected';
      emailBody = `
        Hi ${fullName},<br/><br/>
        We're sorry to inform you that your company <strong>${companyName}</strong> has been <strong>rejected</strong>.<br/>
        For more information, please contact our support team.<br/><br/>
        Regards,<br/>
        - The Team
      `;
    }

    if (officialEmail) {
      await sendMail(officialEmail, emailSubject, emailBody);
    }

    res.json({ success: true, company });
  } catch (err) {
    console.error('Error updating company status:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};
