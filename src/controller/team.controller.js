import User from "../models/user.model.js";
import TeamSchema from '../models/team.model.js'

export const getAllTeammembersCompany = async (req, res) => {
  try {
    const { companyId } = req.user;

    // Fetch employees
    const users = await User.find(
      { 
        companyId,
        position: "Employee"
      },
      "firstName lastName email phoneNumber _id" // Include _id for task assignment lookup
    ).sort({ firstName: 1 });

    // Get bucketName for each user
    const usersWithBuckets = await Promise.all(
      users.map(async (user) => {
        // Find task assignment for this user
        const assignment = await TaskAssignment.findOne({ userId: user._id });
        
        return {
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phoneNumber: user.phoneNumber,
          bucketName: assignment?.bucketName
        };
      })
    );

    res.status(200).json({
      message: "Employee details retrieved successfully",
      count: usersWithBuckets.length,
      data: usersWithBuckets
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ 
      message: "Internal Server Error",
      error: error.message 
    });
  }
};
