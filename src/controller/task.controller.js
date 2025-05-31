// controllers/taskController.js
import TaskAssignment from "../models/taskAssignment.model.js";
import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";
import mongoose from "mongoose";
import axios from "axios";
import { CompanyRegistration } from "../models/companyregistration.model.js";

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
      tagMembers,
      attachmentRequired,
      recurring,
      taskDescription,
      remark,
    } = req.body;

    // Get companyId and adminId from the JWT token
    const { companyId, adminId } = req.user;

    // Basic validation
    if (!bucketName || !assignedTo || !assignDate || !deadline || !taskDescription) {
      return res.status(400).json({
        message: "Required fields are missing",
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
      priority: priority || "Medium",
      status: status || "Open",
      tagMembers: tagMembers || [], // Store as array of user IDs
      attachmentRequired: attachmentRequired || false,
      taskDescription,
    });

    const savedTaskAssignment = await newTaskAssignment.save();

    res.status(201).json({
      message: "Task assignment created successfully",
      data: savedTaskAssignment,
    });
  } catch (error) {
    console.error("Error creating task assignment:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({
      message: "Server error while creating task assignment",
    });
  }
};

// Helper function to check if a project overlaps with the given time period
const doesProjectOverlapWithPeriod = (assignDate, deadline, periodStart, periodEnd) => {
  const projectStart = new Date(assignDate);
  const projectEnd = new Date(deadline);

  // Check if there's any overlap between project duration and the period
  return projectStart <= periodEnd && projectEnd >= periodStart;
};

// Helper function to get date range based on filter
const getDateRangeForFilter = (filter) => {
  const now = new Date();
  let startDate, endDate;

  switch (filter) {
    case "week":
      // Get start of current week (Sunday)
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "month":
      // Get start of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case "year":
      // Get start of current year
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;

    default:
      return null;
  }

  return { startDate, endDate };
};

export const getTaskAssignments = async (req, res) => {
  try {
    // Get companyId and userId from the JWT token
    const { companyId, userId } = req.user;

    // Optional query parameters for filtering
    const { status, assignedTo, fromDate, toDate, timeFilter } = req.query;

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

    // Get all tasks first without date filtering for overlap logic
    let taskAssignments = await TaskAssignment.find(query)
      .populate("assignedTo", "firstName lastName email")
      .populate("assignedBy", "fullName email")
      .populate("tagMembers", "firstName lastName email")
      .sort({ assignDate: -1 })
      .lean();

    // Apply date filtering logic
    if (fromDate || toDate || timeFilter) {
      if (timeFilter && timeFilter !== "all") {
        const dateRange = getDateRangeForFilter(timeFilter);

        if (dateRange) {
          const { startDate, endDate } = dateRange;

          // Filter tasks that overlap with the specified period
          taskAssignments = taskAssignments.filter((task) =>
            doesProjectOverlapWithPeriod(task.assignDate, task.deadline, startDate, endDate),
          );
        }
      } else if (fromDate || toDate) {
        // Use explicit fromDate and toDate if provided
        const filterStart = fromDate ? new Date(fromDate) : new Date("1970-01-01");
        const filterEnd = toDate ? new Date(toDate) : new Date("2099-12-31");

        taskAssignments = taskAssignments.filter((task) =>
          doesProjectOverlapWithPeriod(task.assignDate, task.deadline, filterStart, filterEnd),
        );
      }
    }

    res.status(200).json({
      count: taskAssignments.length,
      data: taskAssignments,
      filter: {
        timeFilter: timeFilter || "all",
        fromDate,
        toDate,
        status,
        assignedTo,
      },
    });
  } catch (error) {
    console.error("Error fetching task assignments:", error);
    res.status(500).json({
      message: "Server error while fetching task assignments",
    });
  }
};

export const getUserTaskAssignments = async (req, res) => {
  try {
    // Get user ID and company ID from the JWT token
    const { userId, companyId } = req.user;

    // Optional query parameters for filtering
    const { status, fromDate, toDate } = req.query;

    // Base query - tasks assigned to current user within their company
    let query = {
      companyId,
      assignedTo: userId,
    };

    // Apply filters if provided
    if (status) {
      query.status = status;
    }

    if (fromDate || toDate) {
      query.assignDate = {};
      if (fromDate) query.assignDate.$gte = new Date(fromDate);
      if (toDate) query.assignDate.$lte = new Date(toDate);
    }

    // Only select the required fields
    const taskAssignments = await TaskAssignment.find(query)
      .select("bucketName assignDate deadline status") // Added status for user visibility
      .sort({ assignDate: -1 })
      .lean();

    res.status(200).json({
      count: taskAssignments.length,
      data: taskAssignments,
    });
  } catch (error) {
    console.error("Error fetching user task assignments:", error);
    res.status(500).json({
      message: "Server error while fetching your tasks",
      error: error.message,
    });
  }
};

export const getAdminTaskAssignments = async (req, res) => {
  try {
    // Get companyId from the JWT token (admin has full access)
    const { companyId } = req.user;

    // Optional query parameters for filtering
    const { status, assignedTo, fromDate, toDate } = req.query;

    // Base query - only filter by company ID for admin view
    let query = { companyId };

    // Apply filters if provided
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

    // Only select the three required fields
    const taskAssignments = await TaskAssignment.find(query)
      .select("bucketName assignDate deadline") // Only these three fields
      .sort({ assignDate: -1 })
      .lean();

    res.status(200).json({
      count: taskAssignments.length,
      data: taskAssignments,
    });
  } catch (error) {
    console.error("Error fetching admin task assignments:", error);
    res.status(500).json({
      message: "Server error while fetching task assignments",
      error: error.message,
    });
  }
};

export const getOngoingProjects = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { timeFilter } = req.query;

    // Base query for ongoing tasks
    let query = {
      companyId,
      status: { $in: ["Open", "In Progress"] },
    };

    // Get all ongoing tasks first
    let ongoingTasks = await TaskAssignment.find(query)
      .select("bucketName taskDescription assignedTo assignDate deadline") // Include deadline for overlap check
      .populate("assignedTo", "firstName lastName photoUrl")
      .sort({ assignDate: -1 })
      .lean();

    // Apply time filtering with overlap logic
    if (timeFilter && timeFilter !== "all") {
      const dateRange = getDateRangeForFilter(timeFilter);

      if (dateRange) {
        const { startDate, endDate } = dateRange;

        // Filter tasks that overlap with the specified period
        ongoingTasks = ongoingTasks.filter((task) =>
          doesProjectOverlapWithPeriod(task.assignDate, task.deadline, startDate, endDate),
        );
      }
    }

    const result = ongoingTasks.map((task) => ({
      assignedToName: task.assignedTo
        ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
        : "Unassigned",
      bucketName: task.bucketName,
      taskDescription: task.taskDescription,
      photoUrl: task.assignedTo?.photoUrl || "",
      assignDate: task.assignDate,
      deadline: task.deadline, // Include deadline in response for reference
    }));

    res.status(200).json({
      count: result.length,
      data: result,
      filter: {
        timeFilter: timeFilter || "all",
      },
    });
  } catch (error) {
    console.error("Error fetching ongoing projects:", error);
    res.status(500).json({
      message: "Server error while fetching ongoing projects",
    });
  }
};

export const getAllUserEmails = async (req, res) => {
  try {
    const { companyId } = req.user;

    // Find all users in the company and return their ID, name and email
    const users = await User.find({ companyId }, "firstName lastName email _id");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching user emails:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// New function to close a task
export const closeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { remarkDescription, fileUrl, filePublicId, fileResourceType, fileName } = req.body;
    const { companyId, userId } = req.user;

    const task = await TaskAssignment.findOne({
      _id: taskId,
      companyId,
      $or: [{ assignedTo: userId }, { assignedBy: userId }, { tagMembers: userId }],
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found or access denied",
      });
    }

    if (task.status === "Closed") {
      return res.status(400).json({
        success: false,
        message: "Task is already closed",
      });
    }

    // Build attachment object if provided
    const uploadedFile =
      fileUrl && filePublicId
        ? {
            fileName: fileName || "attachment",
            fileUrl,
            filePublicId,
            fileResourceType: fileResourceType || "raw",
          }
        : null;

    // Check if attachment is required but missing
    if (task.attachmentRequired && !uploadedFile) {
      return res.status(400).json({
        success: false,
        message: "Attachment is required to close this task",
      });
    }

    const updateData = {
      status: "Closed",
      remarkDescription: remarkDescription || "",
      updatedAt: new Date(),
    };

    if (uploadedFile) {
      updateData.$push = { documents: uploadedFile };
    }

    const updatedTask = await TaskAssignment.findByIdAndUpdate(taskId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("assignedTo", "firstName lastName email")
      .populate("assignedBy", "fullName email")
      .populate("tagMembers", "firstName lastName email");

    return res.status(200).json({
      success: true,
      message: "Task closed successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("Error closing task:", error);
    res.status(500).json({
      success: false,
      message: "Server error while closing task",
    });
  }
};

// Updated function to get task statistics with overlap-based time filtering
export const getTaskStatistics = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { timeFilter } = req.query;

    // Base query
    let query = {
      companyId,
    };

    // Get all tasks matching the base criteria
    let tasks = await TaskAssignment.find(query).lean();

    // Apply time filtering with overlap logic
    if (timeFilter && timeFilter !== "all") {
      const dateRange = getDateRangeForFilter(timeFilter);

      if (dateRange) {
        const { startDate, endDate } = dateRange;

        // Filter tasks that overlap with the specified period
        tasks = tasks.filter((task) =>
          doesProjectOverlapWithPeriod(task.assignDate, task.deadline, startDate, endDate),
        );
      }
    }

    // Calculate statistics
    const stats = {
      total: tasks.length,
      open: tasks.filter((task) => task.status === "Open").length,
      inProgress: tasks.filter((task) => task.status === "In Progress").length,
      completed: tasks.filter((task) => task.status === "Completed").length,
      closed: tasks.filter((task) => task.status === "Closed").length,
      deferred: tasks.filter((task) => task.status === "Deferred").length,
    };

    // Calculate percentages
    const percentages = {};
    Object.keys(stats).forEach((key) => {
      if (key !== "total") {
        percentages[key] = stats.total > 0 ? Math.round((stats[key] / stats.total) * 100) : 0;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        counts: stats,
        percentages,
        filter: {
          timeFilter: timeFilter || "all",
        },
      },
    });
  } catch (error) {
    console.error("Error fetching task statistics:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching task statistics",
    });
  }
};

export const getAllLOCs = async (req, res) => {
  try {
    const { companyId } = req.user;

    // Fetch users with required fields
    const users = await User.find({ companyId }, "firstName lastName email _id position").sort({
      firstName: 1,
    });

    // Fetch company registration details
    const company = await CompanyRegistration.findById(companyId)
      .select("companyInfo.companyName adminInfo.fullName")
      .lean();

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Add fullName first and maintain proper order
    const updatedUsers = users.map((user) => ({
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      position: user.position,
      companyName: company.companyInfo.companyName,
      CEO: company.adminInfo.fullName,
    }));

    res.status(200).json({
      message: "User details retrieved successfully",
      count: updatedUsers.length,
      data: updatedUsers,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getAllTeammembers = async (req, res) => {
  try {
    const { companyId } = req.user;

    // Validate companyId
    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required",
        error: "Invalid user session",
      });
    }

    // Fetch ONLY employees with strict filtering
    const users = await User.find(
      {
        companyId,
        position: { $eq: "Employee" }, // Strict equality check
        $and: [
          { position: { $exists: true } }, // Position field must exist
          { position: { $ne: null } }, // Position must not be null
          { position: { $ne: "" } }, // Position must not be empty
          { position: { $regex: /^Employee$/i } }, // Case-insensitive exact match
        ],
      },
      "firstName lastName email phoneNumber position _id", // Include position for verification
    ).sort({ firstName: 1 });

    // Additional strict validation - Double check each user
    const strictEmployeesOnly = users.filter((user) => {
      // Validate that user has all required fields
      if (!user.firstName || !user.lastName || !user.email || !user.position) {
        console.warn(`User ${user._id} missing required fields, excluding from employee list`);
        return false;
      }

      // Strict position check - must be exactly "Employee"
      const userPosition = user.position.toString().trim();
      if (userPosition !== "Employee") {
        console.warn(
          `User ${user._id} has position "${userPosition}", not "Employee". Excluding from list.`,
        );
        return false;
      }

      return true;
    });

    // Log validation results
    const filteredCount = users.length - strictEmployeesOnly.length;
    if (filteredCount > 0) {
      console.warn(`Filtered out ${filteredCount} non-employee users from team member selection`);
    }

    // If no valid employees found
    if (strictEmployeesOnly.length === 0) {
      return res.status(404).json({
        message: "No employees found for team member selection",
        count: 0,
        data: [],
      });
    }

    // Get bucketName for each verified employee
    const usersWithBuckets = await Promise.all(
      strictEmployeesOnly.map(async (user) => {
        try {
          // Find task assignment for this user
          const assignment = await TaskAssignment.findOne({ userId: user._id });

          return {
            userId: user._id, // Include userId for selection
            fullName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            phoneNumber: user.phoneNumber,
            position: user.position, // Include position for frontend verification
            bucketName: assignment?.bucketName || null,
          };
        } catch (assignmentError) {
          console.warn(`Error fetching assignment for user ${user._id}:`, assignmentError.message);
          // Still return user data even if assignment fetch fails
          return {
            userId: user._id,
            fullName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            phoneNumber: user.phoneNumber,
            position: user.position,
            bucketName: null,
          };
        }
      }),
    );

    // Final validation - ensure all returned users are employees
    const finalValidatedEmployees = usersWithBuckets.filter((user) => {
      if (user.position !== "Employee") {
        console.error(
          `CRITICAL: Non-employee ${user.fullName} found in final results. This should not happen!`,
        );
        return false;
      }
      return true;
    });

    // Success response
    res.status(200).json({
      message: "Employee details retrieved successfully",
      count: finalValidatedEmployees.length,
      data: finalValidatedEmployees,
      meta: {
        totalQueried: users.length,
        filteredOut: users.length - finalValidatedEmployees.length,
        companyId: companyId,
      },
    });
  } catch (error) {
    console.error("Error fetching employee details for team selection:", error);

    // Handle specific database errors
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid company ID format",
        error: "Bad Request",
      });
    }

    res.status(500).json({
      message: "Internal Server Error while fetching employees",
      error: error.message,
    });
  }
};

// Optional: Add a separate validation middleware for extra security
export const validateEmployeeAccess = async (req, res, next) => {
  try {
    const { employeeId } = req.body; // Assuming you're sending employeeId when adding to project

    if (!employeeId) {
      return next(); // Skip validation if no employeeId provided
    }

    // Verify the selected user is actually an employee
    const user = await User.findById(employeeId, "position companyId");

    if (!user) {
      return res.status(404).json({
        message: "Selected user not found",
      });
    }

    if (user.position !== "Employee") {
      return res.status(403).json({
        message: "Access denied. Only employees can be added to projects.",
        userPosition: user.position,
      });
    }

    // Verify user belongs to same company
    if (user.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({
        message: "Access denied. User from different company.",
      });
    }

    next();
  } catch (error) {
    console.error("Error in employee validation middleware:", error);
    res.status(500).json({
      message: "Validation error",
      error: error.message,
    });
  }
};
