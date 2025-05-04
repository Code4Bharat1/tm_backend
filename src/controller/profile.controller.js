// controllers/userController.js
import User from '../models/user.model.js';

 const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId; // from JWT
        console.log('User ID from token:', userId); // Debugging line
        const user = await User.findOne({ _id: userId }).select('firstName lastName position phoneNumber email photoUrl');

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

export { getUserProfile, updateProfile };