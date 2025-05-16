import User from '../models/user.model.js';
import Admin from '../models/admin.model.js';
import { sendMail } from "../service/nodemailerConfig.js";

const createUser = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, email, position, gender, dateOfJoining } = req.body;
    const password = 'User@1234'; // Default password
    const adminId = req.user.adminId; // Extracted from JWT by middleware

    if (!adminId) {
      return res.status(403).json({ message: 'Admin ID is required' });
    }

    // Replace AdminModel with your actual model name (e.g., Mongoose, Sequelize, etc.)
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const companyName = admin.companyName || 'Default Company';

    // Validate required fields
    if (!firstName || !lastName || !phoneNumber || !password || !email || !companyName || !position || !gender || !dateOfJoining) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate Indian phone number
    if (!/^[789]\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid Indian phone number' });
    }

    // Validate email
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    // Check if email or phone already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    // Validate password strength
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
      });
    }
    if (existingUser) {
      return res
        .status(409)
        .json({ message: 'User with this email or phone number already exists' });
    }

    // Create user (userId will be auto-generated in the model)
    const newUser = new User({
      firstName,
      lastName,
      phoneNumber,
      email,
      companyName,
      password,
      position,
      Gender: gender,
      DateOfJoining: dateOfJoining,
      companyId: admin.companyId,
    });

    await newUser.save();

    await sendMail(
      newUser.email,
      'Your Account Credentials - Please Change Your Password Immediately',
      `
Hello ${newUser.firstName || 'User'},

Welcome to ${newUser.companyName}! Your account has been successfully created.

Here are your login details:

- **Login ID:** ${newUser.email} / ${newUser.phoneNumber}
- **Temporary Password:** ${password}

For your security, please log in and change this password immediately.\n
 If you do not change your password promptly, you may be at risk of unauthorized access, and the responsibility for any security issues will rest with you.

Our support team is always here to help if you need assistance.

Thank you for joining us!

Stay safe and secure,
The Task Manager Team
  `
    );



    res.status(201).json({
      message: 'User created successfully',
      user: {
        userId: newUser.userId,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phoneNumber: newUser.phoneNumber,
        email: newUser.email,
        companyName: newUser.companyName,
        password: newUser.password,
        position: newUser.position,
        gender: newUser.Gender,
        dateOfJoining: newUser.DateOfJoining,
        companyId: newUser.companyId,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ message: `Duplicate ${duplicateField}` });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const bulkCreateUsers = async (req, res) => {
  try {
    const adminId = req.user.adminId;
    const users = req.body.users;

    if (!adminId) {
      return res.status(403).json({ message: 'Admin ID is required' });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const companyName = admin.companyName || 'Default Company';

    const createdUsers = [];

    for (const userData of users) {
      const { firstName, lastName, phoneNumber, email, position, gender, dateOfJoining } = userData;

      // Check for duplicates
      const exists = await User.findOne({ $or: [{ email }, { phoneNumber }] });
      if (exists) continue;

      const password = 'User@1234'; // default password
      const newUser = new User({
        firstName,
        lastName,
        phoneNumber,
        email,
        companyName,
        password,
        position,
        Gender: gender,
        DateOfJoining: dateOfJoining,
        companyId: admin.companyId,
      });

      await newUser.save();
      createdUsers.push(newUser);

      // Optionally send email
      await sendMail(
        newUser.email,
        'Your Account Credentials - Please Change Your Password Immediately',
        `
Hello ${newUser.firstName || 'User'},

Welcome to ${newUser.companyName}! Your account has been successfully created.

Here are your login details:

- **Login ID:** ${newUser.email} / ${newUser.phoneNumber}
- **Temporary Password:** ${password}

For your security, please log in and change this password immediately.\n
 If you do not change your password promptly, you may be at risk of unauthorized access, and the responsibility for any security issues will rest with you.

Our support team is always here to help if you need assistance.

Thank you for joining us!

Stay safe and secure,
The Task Manager Team
  `
      );
    }

    res.status(201).json({
      message: `Created ${createdUsers.length} employees successfully`,
      users: createdUsers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export { createUser, bulkCreateUsers };
