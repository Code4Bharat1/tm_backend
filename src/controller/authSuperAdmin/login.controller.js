import { SuperAdmin } from "../../models/superadmin.model.js";
import jwt from 'jsonwebtoken';

// Environment variable or secret key (set in .env or config)
const JWT_SECRET = process.env.JWT_SECRET;

export async function loginSuperAdmin(req, res) {
  const { email, password } = req.body;

  // 1. Validate input
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // 2. Find super admin by email
    const admin = await SuperAdmin.findOne({ email });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials (email).' });
    }

    // 3. Compare password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials (password).' });
    }

    // 4. Create JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        isRoot: admin.isRoot,
        permission: admin.permission,
        email: admin.email
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 5. Respond with token and user info (excluding password)
    res.status(200).json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        userName: admin.userName,
        email: admin.email,
        isRoot: admin.isRoot,
        permission: admin.permission
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}

