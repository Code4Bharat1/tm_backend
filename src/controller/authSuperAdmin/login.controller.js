import { SuperAdmin } from "../../models/superadmin.model.js";
import jwt from "jsonwebtoken";
import cookie from "cookie"; // Import the cookie package

// Environment variable or secret key (set in .env or config)
const JWT_SECRET = process.env.JWT_SECRET;

export async function loginSuperAdmin(req, res) {
  const { email, password } = req.body;

  // 1. Validate input
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    // 2. Find super admin by email
    const admin = await SuperAdmin.findOne({ email });

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials (email)." });
    }

    // 3. Compare password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Invalid credentials (password)." });
    }

    // 4. Create JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        isRoot: admin.isRoot,
        permission: admin.permission,
        email: admin.email,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    // 5. Set JWT token in a secure, HTTP-only cookie
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("superAdminToken", token, {
        httpOnly: true, // Ensures the cookie is not accessible via JavaScript
        secure: process.env.NODE_ENV === "production", // Use secure cookies in production
        maxAge: 24 * 60 * 60, // 1 day
        sameSite: "Strict",
        domain:
          process.env.NODE_ENV === "production"
            ? ".code4bharat.com"
            : undefined,
        path: "/",
      }),
    );

    // 6. Respond with user info (excluding password)
    res.status(200).json({
      message: "Login successful",
      admin: {
        id: admin._id,
        userName: admin.userName,
        email: admin.email,
        isRoot: admin.isRoot,
        permission: admin.permission,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

export async function signUpSuperAdmin(req, res) {
  const { userName, email, password, permission, isRoot } = req.body;

  // 1. Validate inputs
  if (!userName || !email || !password) {
    return res
      .status(400)
      .json({ message: "Username, email, and password are required." });
  }

  try {
    // 2. Check for existing user/email
    const existingUser = await SuperAdmin.findOne({
      $or: [{ email }, { userName }],
    });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with same email or username already exists." });
    }

    // 3. Enforce isRoot = false for all except root creator (optional)
    const adminData = {
      userName,
      email,
      password,
      permission: permission || ["read-only"],
      isRoot: false, // Force non-root unless logic permits
    };

    const newAdmin = new SuperAdmin(adminData);
    await newAdmin.save();

    res.status(201).json({
      message: "SuperAdmin created successfully",
      admin: {
        id: newAdmin._id,
        userName: newAdmin.userName,
        email: newAdmin.email,
        permission: newAdmin.permission,
        isRoot: newAdmin.isRoot,
      },
    });
  } catch (error) {
    console.error("Sign-up error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}
