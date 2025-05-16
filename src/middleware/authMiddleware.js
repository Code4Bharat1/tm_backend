// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
 const protect = (req, res, next) => {
    try {
        const token = req.cookies.token; // Assuming it's stored as 'token'

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // decoded should contain userId or other info
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token is not valid', error });
    }
};



export { protect };
// This middleware checks for a JWT token in the request cookies, verifies it, and attaches the decoded user information to the request object.
//  If the token is missing or invalid, it sends a 401 Unauthorized response.