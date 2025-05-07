import Admin from '../../models/admin.model.js';

export const signUpAdmin = async (req, res) => {
  try {
    const { fName, lName, phone, email, password } = req.body;

    // Validate required fields
    if (!fName || !lName || !phone || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate phone number format
    if (!/^[789]\d{9}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid Indian phone number' });
    }

    //Validate password strength
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
      });
    }

    // Check if admin already exists
    const adminExists = await Admin.findOne({
      $or: [{ email }, { phone }],
    });
    if (adminExists) {
      const conflictingField = adminExists.email === email ? 'email' : 'phone number';
      return res.status(409).json({
        message: `Admin already exists with this ${conflictingField}`,
      });
    }

    //Create admin
    const newAdmin = new Admin({
      fName,
      lName,
      phone,
      email,
      password,
    });

    await newAdmin.save();

    res.status(200).json({
      adminId: newAdmin.adminId,
      fName: newAdmin.fName,
      lName: newAdmin.lName,
      phone: newAdmin.phone,
      email: newAdmin.email,
      password: newAdmin.password,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
