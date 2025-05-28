import User from '../models/user.model.js';

export const roleMiddleware = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
    
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Step 1: Fetch the user
      const user = await User.findById(userId);
  

      if (!user || !user.position) {
        return res.status(404).json({
          success: false,
          error: 'User or role (position) not found'
        });
      }

      // Step 2: Check if user's position is allowed
      if (!allowedRoles.includes(user.position)) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized access'
        });
      }

      // Optional: Attach role to req.user
      req.user.role = user.position;

      next();

    } catch (error) {
      console.error('Error in roleMiddleware:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error while checking role'
      });
    }
  };
};
