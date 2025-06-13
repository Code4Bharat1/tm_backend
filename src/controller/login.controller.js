import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';

const loginUser = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Email/Phone and password are required' });
  }

  try {
    // Find by email OR phone number
    const user = await User.findOne({
      $or: [{ email: identifier }, { phoneNumber: identifier }],
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email/phone or password' });
    }

    // Compare password (if using comparePassword method in model)
    const isMatch = await user.matchPassword(password); // OR use bcrypt.compare(password, user.password) if not in schema

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email/phone or password' });
    }

    const token = jwt.sign({ userId: user._id, firstName: user.firstName, email: user.email, companyId: user.companyId, position: user.position, companyName: user.companyName }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRATION,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      domain: process.env.NODE_ENV === 'production' ? '.code4bharat.com' : undefined,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        companyName: user.companyName,
        position: user.position,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const auth = async (req, res) => {
  const token = req.cookies.token
  if (!token) return res.status(401).json({ message: 'Unauthorized' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    res.json({ userId: decoded.userId, role: decoded.position })
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' })
  }
}

export { loginUser, auth };
