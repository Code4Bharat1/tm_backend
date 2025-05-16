import TaskAssignment from '../models/taskAssignment.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';

// @desc    Create a new task assignment
// @route   POST /api/task-assignments
// @access  Private
export const createTaskAssignment = async (req, res) => {
  try {
    const {
      bucketName,
      assignedTo,
      assignedBy,
      assignDate,
      deadline,
      dueTime,
      priority,
      status,
      tagMember,
      attachmentRequired,
      recurring,
      taskDescription,
      remark,
    } = req.body;

    // Basic validation
    if (!bucketName || !assignedTo || !assignedBy || !assignDate || !deadline || !taskDescription) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const newTaskAssignment = new TaskAssignment({
      bucketName,
      assignedTo,
      assignedBy,
      assignDate: new Date(assignDate),
      deadline: new Date(deadline),
      dueTime: dueTime || undefined,
      priority: priority || 'Medium',
      status: status || 'Open',
      tagMember: tagMember || undefined,
      attachmentRequired: attachmentRequired || false,
      recurring: recurring || false,
      taskDescription,
      remark: remark || undefined,
    });

    const savedTaskAssignment = await newTaskAssignment.save();

    res.status(201).json({
      message: 'Task assignment created successfully',
      data: savedTaskAssignment,
    });
  } catch (error) {
    console.error('Error creating task assignment:', error);
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while creating task assignment' });
  }
};

// @desc    Get all task assignments
// @route   GET /api/task-assignments
// @access  Private
export const getTaskAssignments = async (req, res) => {
  try {
    // Optional query parameters for filtering
    const { status, assignedTo, fromDate, toDate } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (fromDate || toDate) {
      query.assignDate = {};
      if (fromDate) query.assignDate.$gte = new Date(fromDate);
      if (toDate) query.assignDate.$lte = new Date(toDate);
    }

    const taskAssignments = await TaskAssignment.find(query).sort({ assignDate: -1 }).lean();

    res.status(200).json({
      count: taskAssignments.length,
      data: taskAssignments,
    });
  } catch (error) {
    console.error('Error fetching task assignments:', error);
    res.status(500).json({ message: 'Server error while fetching task assignments' });
  }
};

export const getAllUserEmails = async (req, res) => {
  try {
    const emails = await User.find({}, "email"); // Fetch only the `email` field
    res.status(200).json(emails);
  } catch (error) {
    console.error("Error fetching user emails:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};