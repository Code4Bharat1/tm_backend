import userModel from "../models/user.model.js";
import { sendMail } from "../service/nodemailerConfig.js";
const generateOtp = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // expires in 5 minutes

        user.otp = otp;
        user.expiresAt = expiresAt;

        await user.save();

        //Send OTP via email here
        await sendMail(email, 'Your OTP Code for Password Reset',
            `
    Hello ${user.firstName || 'User'},\n
    \n
    Your One-Time Password (OTP) for resetting your password is: ${otp}\n
    This OTP is valid for the next 5 minutes. Please do not share it.\n
    \n
    If you did not request this, please ignore this email.\n
    \n
    Regards,\n
    Support Team\n
`);

        res.status(200).json({
            message: "OTP generated successfully",
            otp // ⚠️ Remove this in production!
        });
    } catch (error) {
        console.error("OTP generation error:", error);
        res.status(500).json({ message: "Server error" });
    }
};


const verifyOtpAndChangePassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        // Validate required fields
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required' });
        }

        // Find user by email
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if OTP matches and is not expired
        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        const currentTime = new Date();
        if (currentTime > user.expiresAt) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        // Update the user's password and clear OTP fields (no hashing here)
        user.password = newPassword;  // Store the password directly
        user.otp = null;
        user.expiresAt = null;

        // Save the user with the updated password
        await user.save();

        // Send confirmation email (you can customize this part as needed)
        await sendMail(
            email,
            'Password Reset Successful',
            `
            Hello ${user.firstName || 'User'},\n
            \n
            Your password has been successfully changed. If you did not initiate this change, please contact support immediately.\n
            \n
            Regards,\n
            Support Team\n
        `);

        return res.status(200).json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Error verifying OTP and changing password:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const generateOtpAdmin = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // expires in 5 minutes

        user.otp = otp;
        user.expiresAt = expiresAt;

        await user.save();

        //Send OTP via email here
        await sendMail(email, 'Your OTP Code for Password Reset',
            `
    Hello ${user.firstName || 'User'},\n
    \n
    Your One-Time Password (OTP) for resetting your password is: ${otp}\n
    This OTP is valid for the next 5 minutes. Please do not share it.\n
    \n
    If you did not request this, please ignore this email.\n
    \n
    Regards,\n
    Support Team\n
`);

        res.status(200).json({
            message: "OTP generated successfully",
            otp // ⚠️ Remove this in production!
        });
    } catch (error) {
        console.error("OTP generation error:", error);
        res.status(500).json({ message: "Server error" });
    }
};


const verifyOtpAndChangePasswordAdmin = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        // Validate required fields
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required' });
        }

        // Find user by email
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if OTP matches and is not expired
        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        const currentTime = new Date();
        if (currentTime > user.expiresAt) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        // Update the user's password and clear OTP fields (no hashing here)
        user.password = newPassword;  // Store the password directly
        user.otp = null;
        user.expiresAt = null;

        // Save the user with the updated password
        await user.save();

        // Send confirmation email (you can customize this part as needed)
        await sendMail(
            email,
            'Password Reset Successful',
            `
            Hello ${user.firstName || 'User'},\n
            \n
            Your password has been successfully changed. If you did not initiate this change, please contact support immediately.\n
            \n
            Regards,\n
            Support Team\n
        `);

        return res.status(200).json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Error verifying OTP and changing password:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export { generateOtp, verifyOtpAndChangePassword };