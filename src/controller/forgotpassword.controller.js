import userModel from "../models/user.model.js";

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

        // Optionally: Send OTP via email here

        res.status(200).json({
            message: "OTP generated successfully",
            otp // ⚠️ Remove this in production!
        });
    } catch (error) {
        console.error("OTP generation error:", error);
        res.status(500).json({ message: "Server error" });
    }
};


export { generateOtp };