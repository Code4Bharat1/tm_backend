import userModel from "../models/user.model.js";


const loginUser = async (req, res) => {
    const { identifier, password } = req.body; // 'identifier' can be email or phone

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Email/Phone and password are required' });
    }

    try {
        // Find by email OR phone number
        const user = await userModel.findOne({
            $or: [
                { email: identifier },
                { phoneNumber: identifier }
            ]
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email/phone or password' });
        }

        // Compare password (if using comparePassword method in model)
        const isMatch = await user.matchPassword(password); // OR use bcrypt.compare(password, user.password) if not in schema

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email/phone or password' });
        }

        res.status(200).json({
            message: 'Login successful',
            user: {
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber,
                email: user.email,
                companyName: user.companyName,
                position: user.position
            }
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


export {loginUser};