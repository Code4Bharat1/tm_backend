import TaskAssignment from '../models/taskAssignment.model.js';
import User from '../models/user.model.js';

export const createTaskAssignment = async (req, res) => {
  try {
    const {
      bucketName,
      assignedTo,
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

    const companyId = req.user.companyId; // from JWT
    const assignedBy = req.user._id; // get admin id from JWT here

    if (
      !bucketName ||
      !assignedTo ||
      !assignedBy ||
      !assignDate ||
      !deadline ||
      !taskDescription
    ) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const newTaskAssignment = new TaskAssignment({
      companyId,
      bucketName,
      assignedTo,
      assignedBy, // use id from JWT here
      assignDate: new Date(assignDate),
      deadline: new Date(deadline),
      dueTime,
      priority,
      status,
      tagMember,
      attachmentRequired,
      recurring,
      taskDescription,
      remark,
    });

    const savedTask = await newTaskAssignment.save();

    res.status(201).json({
      message: 'Task assignment created successfully',
      data: savedTask,
    });
  } catch (error) {
    console.error('Error creating task assignment:', error);
    res.status(500).json({
      message: 'Server error while creating task assignment',
    });
  }
};



export const getTaskAssignments = async (
  req,
  res,
) => {
  try {
    // Optional query parameters for filtering
    const {
      status,
      assignedTo,
      fromDate,
      toDate,
    } = req.query;

    let query = {};

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
    const emails = await User.find({}, 'email'); // Fetch only the `email` field
    res.status(200).json(emails);
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
