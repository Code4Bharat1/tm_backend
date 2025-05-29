import User from "../models/user.model.js";
import Team from '../models/team.model.js'; // Import as Team
import mongoose from "mongoose";

export const createBucketAssignment = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { bucketName, userId } = req.body; // Get userId from request body

    // Validate input
    if (!bucketName || !userId) {
      return res.status(400).json({
        message: "Bucket name and user ID are required",
      });
    }

    // Validate user exists and belongs to the same company
    const user = await User.findOne({
      _id: userId, // Use _id to find user
      companyId,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found or doesn't belong to your company",
      });
    }

    // Check if user already has a bucket assignment
    const existingAssignment = await Team.findOne({ userId });
    if (existingAssignment) {
      return res.status(400).json({
        message: "User already has a bucket assignment",
      });
    }

    // Create new bucket assignment
    const newAssignment = new Team({
      bucketName,
      userId,
    });

    await newAssignment.save();

    res.status(201).json({
      message: "Bucket assignment created successfully",
      data: {
        bucketName: newAssignment.bucketName,
        userId: newAssignment.userId,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phoneNumber: user.phoneNumber,
        position: user.position,
      },
    });
  } catch (error) {
    console.error("Error creating bucket assignment:", error);
    
    // Handle specific errors
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        message: "Invalid user ID format",
      });
    }
    
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getAllTeammembersCompany = async (req, res) => {
  try {
    const { companyId } = req.user;

    // Fetch employees with necessary fields including _id
    const users = await User.find(
      { 
        companyId,
      },
      "firstName lastName email phoneNumber position _id" // Added _id
    ).sort({ firstName: 1 });

    // Format user data with userId
    const formattedUsers = users.map((user) => ({
      userId: user._id, // Include user ID
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phoneNumber: user.phoneNumber,
      position: user.position
    }));

    res.status(200).json({
      message: "Employee details retrieved successfully",
      count: formattedUsers.length,
      data: formattedUsers
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ 
      message: "Internal Server Error",
      error: error.message 
    });
  }
};
