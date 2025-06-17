import { CompanyRegistration } from "../models/companyregistration.model.js";
import Admin from "../models/admin.model.js";
import jwt from "jsonwebtoken";
import { sendMail } from "../service/nodemailerConfig.js";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;

export const generateReadablePassword = (fullName = "User") => {
  const firstName = fullName.trim().split(" ")[0] || "User";
  const randomNum = crypto.randomInt(1000, 9999); // ensures 4-digit random number
  return `${firstName}@${randomNum}`;
};
// Register a new company
export const registerCompany = async (req, res) => {
  try {
    const { companyInfo, adminInfo, planPreferences, termsAccepted, status } =
      req.body;

    if (!termsAccepted) {
      return res
        .status(400)
        .json({ message: "You must accept the terms and conditions." });
    }

    // Check if admin email already exists
    const existing = await CompanyRegistration.findOne({
      "adminInfo.officialEmail": adminInfo.officialEmail,
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Admin email already registered." });
    }

    const newCompany = new CompanyRegistration({
      companyInfo,
      adminInfo,
      planPreferences,
      termsAccepted,
      status,
    });

    await newCompany.save();

    await sendMail(
      adminInfo.officialEmail,
      "Task Manager Registration Received",
      `
<!DOCTYPE html>
<html>
  <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 20px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <tr>
              <td align="center" style="border-bottom: 1px solid #e0e0e0; padding-bottom: 20px;">
                <h2 style="margin: 0; font-size: 22px; color: #2b6cb0;">Task Manager Registration Received</h2>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                <p style="margin: 0 0 16px;">Dear ${
                  adminInfo.fullName || "Admin"
                },</p>
                <p style="margin: 0 0 16px;">
                  Thank you for registering your company on the <strong>Task Manager</strong> platform. We have successfully received your application, and it is currently under review by our Super Admin team.
                </p>
                <p style="margin: 0 0 16px;">
                  Once your registration is approved, you will receive your login credentials via email.
                </p>
                <p style="margin: 0 0 16px;">
                  If you have any questions or need assistance in the meantime, please don't hesitate to contact our support team.
                </p>
                <p style="margin: 0;">Best regards,<br/>— Task Manager Support Team</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 30px; font-size: 14px; color: #777777;">
                © ${new Date().getFullYear()} Task Manager. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `,
    );

    res.status(201).json({
      message: "Company registered successfully",
      companyId: newCompany._id,
    });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Login admin
export const loginCompanyAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const company = await CompanyRegistration.findOne({
      "adminInfo.officialEmail": email,
    });
    if (!company) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const isMatch = await company.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { id: company._id, email: company.adminInfo.officialEmail },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      companyId: company._id,
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Internal server error" });
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
    console.error("Get Companies Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete a company by ID
export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    await CompanyRegistration.findByIdAndDelete(id);
    res.status(200).json({ message: "Company deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCompaniesByStatus = async (req, res) => {
  try {
    const { status } = req.query; // e.g. ?status=Pending
    if (!["Pending", "Active", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
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
      return res
      .status(404)
      .json({ success: false, message: "Company not found" });
    }
    
    const Password = generateReadablePassword(company?.adminInfo?.fullName);
    // Update company status
    company.status = status;

    await company.save();

    const { officialEmail, fullName, designation, phoneNumber } =
      company.adminInfo || {};
    const { companyName } = company.companyInfo || {};

    if (!officialEmail || !Password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing admin info" });
    }

    let emailSubject = "";
    let emailBody = "";

    if (status === "Active") {
      const existingAdmin = await Admin.findOne({
        $or: [{ email: officialEmail }, { phone: phoneNumber }],
      });

      if (!existingAdmin) {
        const adminData = {
          companyName,
          fullName,
          email: officialEmail,
          password: Password,
          position: designation,
          phone: phoneNumber,
          companyId: company._id,
        };

        const newAdmin = new Admin(adminData);
        await newAdmin.save();

        emailSubject = "Welcome to Task Manager!";

        emailBody = `
        <!DOCTYPE html>
        <html>
          <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding: 20px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <tr>
                      <td align="center" style="border-bottom: 1px solid #e0e0e0; padding-bottom: 20px;">
                        <h1 style="margin: 0; font-size: 24px; color: #2b6cb0;">Welcome to Task Manager!</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top: 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                        <p style="margin: 0 0 16px;">Hello ${
                          fullName || "User"
                        },</p>
                        <p style="margin: 0 0 16px;">
                          We're excited to have you on board. Your account has been successfully created for <strong>${companyName}</strong>.
                        </p>
                        <p style="margin: 0 0 10px;"><strong>Here are your login credentials:</strong></p>
                        <div style="background-color: #f0f4ff; padding: 10px 15px; border-radius: 5px; font-family: monospace; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
                          Login ID: ${officialEmail} / ${phoneNumber}<br/>
                          Temporary Password: ${Password}
                        </div>
                        <p style="margin: 0 0 16px;"><strong>Note:</strong> For your security, please log in and change your password immediately.</p>
                        <p style="margin: 0 0 16px;">
                          If you do not change your password promptly, you may be at risk of unauthorized access, and the responsibility for any security issues will rest with you.
                        </p>
                        <p style="margin: 0 0 16px;">Need help? Our support team is always here for you.</p>
                        <p style="margin: 0 0 16px;">Thanks again and welcome!</p>
                        <p style="margin: 0 0 0;">Stay safe and secure,<br/>— The Task Manager Team</p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-top: 30px; font-size: 14px; color: #777777;">
                        © ${new Date().getFullYear()} Task Manager. All rights reserved.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
        `;
      }
    } else if (status === "Rejected") {
      emailSubject = "Company Registration Rejected";
      emailBody = `
<!DOCTYPE html>
<html>
  <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 20px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <tr>
              <td align="center" style="border-bottom: 1px solid #e0e0e0; padding-bottom: 20px;">
                <h2 style="margin: 0; font-size: 22px; color: #c53030;">Company Registration Rejected</h2>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                <p style="margin: 0 0 16px;">Hi ${fullName || "User"},</p>
                <p style="margin: 0 0 16px;">
                  We regret to inform you that your company <strong>${companyName}</strong> has been <strong>rejected</strong> after review.
                </p>
                <p style="margin: 0 0 16px;">
                  If you believe this was a mistake or would like to discuss the reason, please contact our support team.
                </p>
                <p style="margin: 0 0 16px;">
                  We appreciate your interest and encourage you to apply again in the future.
                </p>
                <p style="margin: 0;">Regards,<br/>— The Task Manager Team</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 30px; font-size: 14px; color: #777777;">
                © ${new Date().getFullYear()} Task Manager. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
    }

    if (officialEmail) {
      await sendMail(officialEmail, emailSubject, emailBody);
    }

    res.json({ success: true, company });
  } catch (err) {
    console.error("Error updating company status:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update status" });
  }
};

// Update attendance settings (working days, punch in/out end times)
export const updateAttendanceSettings = async (req, res) => {
  try {
    const {  workingDays, punchInEndTime, punchOutEndTime } = req.body;
    const {companyId}=req.user;
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }
    const update = {};
    if (workingDays) update["attendanceSettings.workingDays"] = workingDays;
    if (punchInEndTime) update["attendanceSettings.punchInEndTime"] = punchInEndTime;
    if (punchOutEndTime) update["attendanceSettings.punchOutEndTime"] = punchOutEndTime;
    const company = await CompanyRegistration.findByIdAndUpdate(
      companyId,
      { $set: update },
      { new: true }
    );
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json({ success: true, attendanceSettings: company.attendanceSettings });
  } catch (err) {
    console.error("Error updating attendance settings:", err);
    res.status(500).json({ success: false, message: "Failed to update attendance settings" });
  }
};

// Get attendance settings for a company
export const getAttendanceSettings = async (req, res) => {
  try {
    const { companyId } = req.user ;
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }
    const company = await CompanyRegistration.findById(companyId, 'attendanceSettings');
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json({ success: true, attendanceSettings: company.attendanceSettings });
  } catch (err) {
    console.error("Error fetching attendance settings:", err);
    res.status(500).json({ success: false, message: "Failed to fetch attendance settings" });
  }
};
