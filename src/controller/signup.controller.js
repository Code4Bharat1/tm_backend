import crypto from "crypto";
import mongoose from "mongoose";
import { defaultFeatures, maxFeature } from "../constants/defaultFeatures.js";
import Admin from "../models/admin.model.js";
import RoleFeatureAccess from "../models/roleFeatureAccess.model.js";
import User from "../models/user.model.js";
import { sendMail } from "../service/nodemailerConfig.js";
import c from "config";

export const generateReadablePassword = (firstName = "User") => {
  const randomNum = crypto.randomInt(1000, 9999); // ensures 4-digit random number
  return `${firstName}@${randomNum}`;
};

const createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phoneNumber,
      email,
      position,
      gender,
      dateOfJoining,
    } = req.body;
    const password = generateReadablePassword(firstName); // Default password
    const adminId = req.user.adminId; // Extracted from JWT by middleware
    const companyId = req.user.companyId; // Extracted from JWT by middleware

    // Validate adminId
    if (!adminId) {
      return res.status(403).json({ message: "Admin ID is required" });
    }

    // Replace AdminModel with your actual model name (e.g., Mongoose, Sequelize, etc.)
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const companyName = admin.companyName || "Default Company";

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !phoneNumber ||
      !password ||
      !email ||
      !companyName ||
      !position ||
      !gender ||
      !dateOfJoining
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate Indian phone number
    if (!/^[789]\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({ message: "Invalid Indian phone number" });
    }

    // Validate email
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    // Check if email or phone already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    // Validate password strength
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
      });
    }
    if (existingUser) {
      return res.status(409).json({
        message: "User with this email or phone number already exists",
      });
    }
    const session = await mongoose.startSession();
    session.startTransaction();

    // Create user (userId will be auto-generated in the model)
    const newUser = await User.create(
      [
        {
          firstName,
          lastName,
          phoneNumber,
          email,
          companyName,
          password,
          position,
          gender,
          dateOfJoining,
          companyId: admin.companyId,
        },
      ],
      { session },
    );

    if (position !== "Employee") {
      const features = defaultFeatures[position] || [];
      const maxFeatures = maxFeature[position] || [];

      if (!features.length) {
        throw new Error("Role must have at least one feature.");
      }

      await RoleFeatureAccess.create(
        [
          {
            userId: newUser[0]._id,
            role: position,
            companyId,
            features,
            maxFeatures,
            addedBy: adminId,
          },
        ],
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    await sendMail(
      newUser[0].email,
      "Your Account Credentials - Please Change Your Password Immediately",
      `
Hello ${newUser[0].firstName || "User"},

Welcome to ${newUser[0].companyName
      }! Your account has been successfully created.

Here are your login details:

- **Login ID:** ${newUser[0].email} / ${newUser[0].phoneNumber}
- **Temporary Password:** ${password}

For your security, please log in and change this password immediately.\n
 If you do not change your password promptly, you may be at risk of unauthorized access, and the responsibility for any security issues will rest with you.

Our support team is always here to help if you need assistance.

Thank you for joining us!

Stay safe and secure,
The Task Manager Team
  `,
    );

    res.status(201).json({
      message: "User created successfully",
      user: {
        userId: newUser.userId,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phoneNumber: newUser.phoneNumber,
        email: newUser.email,
        companyName: newUser.companyName,
        position: newUser.position,
        gender: newUser.gender,
        dateOfJoining: newUser.dateOfJoining,
        companyId: newUser.companyId,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ message: `Duplicate ${duplicateField}` });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const bulkCreateUsers = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const adminId = req.user.adminId;
    const users = req.body.users;
    const companyId = req.user.companyId;

    if (!adminId) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Admin ID is required" });
    }

    const admin = await Admin.findById(adminId).session(session);
    if (!admin) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Admin not found" });
    }

    const companyName = admin.companyName || "Default Company";

    const createdUsers = [];

    for (const userData of users) {
      const {
        firstName,
        lastName,
        phoneNumber,
        email,
        position,
        gender,
        dateOfJoining,
      } = userData;

      const existing = await User.findOne({
        $or: [{ email }, { phoneNumber }],
      }).session(session);
      console.log(existing);
      if (existing) continue; // Skip duplicates

      const password = "User@1234";

      const newUser = new User({
        firstName,
        lastName,
        phoneNumber,
        email,
        companyName,
        password,
        position,
        gender,
        dateOfJoining,
        companyId,
      });

      await newUser.save({ session });
      createdUsers.push(newUser);

      if (position !== "Employee") {
        const features = defaultFeatures[position] || [];
        const maxFeatures = maxFeature[position] || [];

        if (!features.length) {
          throw new Error("Role must have at least one feature.");
        }

        const roleAccess = new RoleFeatureAccess({
          userId: newUser._id,
          role: position,
          companyId,
          features,
          maxFeatures,
          addedBy: adminId,
        });

        await roleAccess.save({ session });
      }

      // Optionally defer emails until after transaction
    }

    await session.commitTransaction();
    session.endSession();

    // Now send emails outside the transaction
    for (const user of createdUsers) {
      await sendMail(
        user.email,
        "Your Account Credentials - Please Change Your Password Immediately",
        `
Hello ${user.firstName || "User"},

Welcome to ${user.companyName}! Your account has been successfully created.

Here are your login details:

- **Login ID:** ${user.email} / ${user.phoneNumber}
- **Temporary Password:** User@1234

Please log in and change your password immediately.

Thank you,
Task Manager Team
        `,
      );
    }

    res.status(201).json({
      message: `Created ${createdUsers.length} employees successfully`,
      users: createdUsers,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getAllEmployee = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(403).json({ message: "Company ID is required" });
    }

    const users = await User.find(
      { companyId },
      "firstName lastName email phoneNumber position gender dateOfJoining companyName",
    ).sort({ firstName: 1 });

    res.status(200).json({
      message: "Users fetched successfully",
      count: users.length,
      users: users,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const updateUserPosition = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { userId } = req.params;
    const { position } = req.body;

    const validPositions = [
      "HR",
      "Employee",
      "Manager",
      "TeamLeader",
      "Salesman",
    ];

    if (!validPositions.includes(position)) {
      return res.status(400).json({ message: "Invalid position value" });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, companyId },
      { position },
      { new: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update or create RoleFeatureAccess if not Employee
    if (position !== "Employee") {
      const features = defaultFeatures[position] || [];
      const maxFeatures = maxFeature[position] || [];
      if (!features.length) {
        return res.status(400).json({ message: "Role must have at least one feature." });
      }
      const roleAccess = await RoleFeatureAccess.findOne({ userId: updatedUser._id, companyId });
      if (roleAccess) {
        // Update existing
        roleAccess.role = position;
        roleAccess.features = features;
        roleAccess.maxFeatures = maxFeatures;
        await roleAccess.save();
      } else {
        // Create new
        await RoleFeatureAccess.create({
          userId: updatedUser._id,
          role: position,
          companyId,
          features,
          maxFeatures,
          addedBy: req.user.adminId || null,
        });
      }
    } else {
      // If position is Employee, optionally remove RoleFeatureAccess
      await RoleFeatureAccess.deleteOne({ userId: updatedUser._id, companyId });
    }

    res.status(200).json({
      message: "User position and features updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { userId } = req.params;

    const deletedUser = await User.findOneAndDelete({ _id: userId, companyId });

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User deleted successfully",
      user: deletedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export {
  bulkCreateUsers, createUser, deleteUser, getAllEmployee,
  updateUserPosition
};

