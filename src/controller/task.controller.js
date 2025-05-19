// controllers/taskController.js
import TaskAssignment from '../models/taskAssignment.model.js';
import User from '../models/user.model.js';
import Admin from '../models/admin.model.js';
import mongoose from 'mongoose';

export const createTaskAssignment = async (
  req,
  res,
) => {
  try {
    const {
      bucketName,
      assignedTo,
      assignDate,
      deadline,
      dueTime,
      priority,
      status,
      tagMembers,
      attachmentRequired,
      recurring,
      taskDescription,
      remark,
    } = req.body;

    // Get companyId and adminId from the JWT token
    const { companyId, adminId } = req.user;

    // Basic validation
    if (
      !bucketName ||
      !assignedTo ||
      !assignDate ||
      !deadline ||
      !taskDescription
    ) {
      return res.status(400).json({
        message: 'Required fields are missing',
      });
    }

    const newTaskAssignment = new TaskAssignment({
      bucketName,
      assignedTo,
      assignedBy: adminId, // Use the adminId from JWT token
      companyId, // Use the companyId from JWT token
      assignDate: new Date(assignDate),
      deadline: new Date(deadline),
      dueTime: dueTime || undefined,
      priority: priority || 'Medium',
      status: status || 'Open',
      tagMembers: tagMembers || [], // Store as array of user IDs
      attachmentRequired:
        attachmentRequired || false,
      recurring: recurring || false,
      taskDescription,
      remark: remark || undefined,
    });

    const savedTaskAssignment =
      await newTaskAssignment.save();

    res.status(201).json({
      message:
        'Task assignment created successfully',
      data: savedTaskAssignment,
    });
  } catch (error) {
    console.error(
      'Error creating task assignment:',
      error,
    );
    if (
      error instanceof
      mongoose.Error.ValidationError
    ) {
      return res
        .status(400)
        .json({ message: error.message });
    }
    res.status(500).json({
      message:
        'Server error while creating task assignment',
    });
  }
};

export const getTaskAssignments = async (
  req,
  res,
) => {
  try {
    // Get companyId and userId from the JWT token
    const { companyId, userId } = req.user;

    // Optional query parameters for filtering
    const {
      status,
      assignedTo,
      fromDate,
      toDate,
    } = req.query;

    // Always filter by company ID and user ID for data isolation
    let query = {
      companyId,
      $or: [
        { assignedTo: userId }, // Tasks assigned to the user
        { assignedBy: userId }, // Tasks created by the user
        { tagMembers: userId }, // Tasks where user is a tag member
      ],
    };

    if (status) {
      query.status = status;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (fromDate || toDate) {
      query.assignDate = {};
      if (fromDate)
        query.assignDate.$gte = new Date(
          fromDate,
        );
      if (toDate)
        query.assignDate.$lte = new Date(toDate);
    }

    const taskAssignments =
      await TaskAssignment.find(query)
        .populate(
          'assignedTo',
          'firstName lastName email',
        )
        .populate('assignedBy', 'fullName email')
        .populate(
          'tagMembers',
          'firstName lastName email',
        )
        .sort({ assignDate: -1 })
        .lean();

    res.status(200).json({
      count: taskAssignments.length,
      data: taskAssignments,
    });
  } catch (error) {
    console.error(
      'Error fetching task assignments:',
      error,
    );
    res.status(500).json({
      message:
        'Server error while fetching task assignments',
    });
  }
};

export const getAllUserEmails = async (
  req,
  res,
) => {
  try {
    const { companyId } = req.user;

    // Find all users in the company and return their ID, name and email
    const users = await User.find(
      { companyId },
      'firstName lastName email _id',
    );

    res.status(200).json(users);
  } catch (error) {
    console.error(
      'Error fetching user emails:',
      error,
    );
    res
      .status(500)
      .json({ message: 'Internal Server Error' });
  }
};