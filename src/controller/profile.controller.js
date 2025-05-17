// controllers/userController.js
import User from '../models/user.model.js';
import Admin from '../models/admin.model.js';

 const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId; // from JWT
        console.log('User ID from token:', userId); // Debugging line
        const user = await User.findOne({ _id: userId }).select('firstName lastName position phoneNumber email photoUrl Gender Address DateOfJoining');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};


 const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId; // Extracted from JWT by middleware

        const {
            firstName,
            lastName,
            phoneNumber,
            email,
            position,
            gender,
            address,
            dateOfJoining,
        } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                firstName,
                lastName,
                phoneNumber,
                email,
                position,
                Gender: gender,            // match schema capitalization
                Address: address,
                DateOfJoining: dateOfJoining,
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found." });
        }

        res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

 const getUserProfileAdmin = async (req, res) => {
    try {
        const adminId = req.user.adminId; // from JWT
        console.log('Admin ID from token:', adminId); // Debugging line
        const admin = await Admin.findOne({ _id: adminId }).select('fullName position phone email photoUrl gender companyName dateOfJoining address');

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        res.json(admin);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};


 const updateProfileAdmin = async (req, res) => {
    try {
        const adminId = req.user.adminId; // Extracted from JWT by middleware

        const {
            fullName,
            phone,
            email,
            position,
            gender,
            dateOfJoining,
            address,
        } = req.body;

        const updatedAdmin = await Admin.findByIdAndUpdate(
            adminId,
            {
                fullName,
                phone,
                email,
                position,
                gender,
                dateOfJoining,
                address,
            },
            { new: true }
        );

        if (!updatedAdmin) {
            return res.status(404).json({ message: "Admin not found." });
        }

        res.status(200).json({
            message: "Profile updated successfully",
            admin: updatedAdmin,
        });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getAllUsersByCompany = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID not found in token' });
    }

    const users = await User.find({ companyId }).select(
      'userId firstName lastName email phoneNumber position photoUrl'
    );

    res.status(200).json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Error fetching users by company:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
};

export { getUserProfile, updateProfile, getUserProfileAdmin, updateProfileAdmin, getAllUsersByCompany };