import User from '../models/user.model.js';

const createUser = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, email, companyName, password } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !phoneNumber || !password || !email || !companyName) {
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
    });

    await newUser.save();

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

export { createUser };
