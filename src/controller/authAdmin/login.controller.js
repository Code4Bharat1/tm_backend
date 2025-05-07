import Admin from '../../models/admin.model.js';
import jwt from 'jsonwebtoken';

export const loginAdmin = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Email/Phone and password are required' });
  }

  try {
    // Find by email OR phone number
    const admin = await Admin.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    }).select('+password');

    if (!admin) {
      return res.status(401).json({ message: 'Invalid email/phone or password' });
    }

    // Compare password (if using comparePassword method in model)
    const isMatch = await admin.matchPassword(password); // OR use bcrypt.compare(password, admin.password) if not in schema

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email/phone or password' });
    }

    const token = jwt.sign({ adminId: admin._id, email: admin.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRATION,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      admin: {
        adminId: admin.adminId,
        fName: admin.fName,
        lName: admin.lName,
        phone: admin.phone,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
