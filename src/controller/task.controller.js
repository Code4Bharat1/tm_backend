// controllers/taskController.js
import mongoose from "mongoose";
import TaskAssignment from "../models/taskAssignment.model.js";
import User from "../models/user.model.js";
import Client from "../models/client.model.js";

// Add this function to your existing task.controller.js

// Get all clients for the current company
export const getAllClientsForTask = async (req, res) => {
  try {
    const { companyId } = req.user;

    const clients = await Client.find({ companyId })
      .select("_id name email")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      clients,
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch clients",
      error: error.message,
    });
  }
};

// Update the existing createTaskAssignment function
export const createTaskAssignment = async (req, res) => {
  try {
    const {
      bucketName,
      projectCategory,
      clientId,
      assignedTo,
      assignDate,
      deadline,
      dueTime,
      priority,
      status,
      tagMembers,
      attachmentRequired,
      taskDescription,
    } = req.body;

    const { adminId, companyId } = req.user;

    // Validate required fields
    if (
      !bucketName ||
      !projectCategory ||
      !assignedTo ||
      !assignDate ||
      !deadline ||
      !taskDescription
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    // Validate client selection for Client category
    if (projectCategory === "Client" && !clientId) {
      return res.status(400).json({
        success: false,
        message: "Client selection is required for Client category projects",
      });
    }

    // Verify that the assignedTo user exists and belongs to the same company
    const assignedUser = await User.findOne({ _id: assignedTo, companyId });
    if (!assignedUser) {
      return res.status(400).json({
        success: false,
        message: "Assigned user not found or doesn't belong to your company",
      });
    }

    // If clientId is provided, verify it exists and belongs to the same company
    if (clientId) {
      const client = await Client.findOne({ _id: clientId, companyId });
      if (!client) {
        return res.status(400).json({
          success: false,
          message: "Client not found or doesn't belong to your company",
        });
      }
    }

    // Validate tag members if provided
    if (tagMembers && tagMembers.length > 0) {
      const validTagMembers = await User.find({
        _id: { $in: tagMembers },
        companyId,
      });

      if (validTagMembers.length !== tagMembers.length) {
        return res.status(400).json({
          success: false,
          message: "Some tagged members are invalid",
        });
      }
    }

    // Create the task assignment
    const taskAssignment = new TaskAssignment({
      bucketName,
      projectCategory,
      clientId: projectCategory === "Client" ? clientId : undefined,
      assignedTo,
      assignedBy: adminId,
      companyId,
      assignDate: new Date(assignDate),
      deadline: new Date(deadline),
      dueTime,
      priority: priority || "Medium",
      status: status || "Open",
      tagMembers: tagMembers || [],
      attachmentRequired: attachmentRequired || false,
      taskDescription,
    });

    const savedTask = await taskAssignment.save();

    // Update client's projectId array if it's a client project
    if (projectCategory === "Client" && clientId) {
      await Client.findByIdAndUpdate(
        clientId,
        { $addToSet: { projectId: savedTask._id } },
        { new: true },
      );
    }

    // Populate the saved task with user and client details
    const populatedTask = await TaskAssignment.findById(savedTask._id)
      .populate("assignedTo", "firstName lastName email")
      .populate("assignedBy", "fullName email")
      .populate("clientId", "name email")
      .populate("tagMembers", "firstName lastName email");

    res.status(201).json({
      success: true,
      message: "Task assigned successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Error creating task assignment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create task assignment",
      error: error.message,
    });
  }
};

// Helper function to check if a project overlaps with the given time period
const doesProjectOverlapWithPeriod = (
  assignDate,
  deadline,
  periodStart,
  periodEnd,
) => {
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
      endDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
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
    const {
      status,
      assignedTo,
      fromDate,
      toDate,
      timeFilter,
      projectCategory,
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

    // Add project category filter
    if (projectCategory) {
      query.projectCategory = projectCategory;
    }

    // Get all tasks first without date filtering for overlap logic
    let taskAssignments = await TaskAssignment.find(query)
      .populate("assignedTo", "firstName lastName email")
      .populate("assignedBy", "fullName email")
      .populate("clientId", "name email") // Add client population
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
            doesProjectOverlapWithPeriod(
              task.assignDate,
              task.deadline,
              startDate,
              endDate,
            ),
          );
        }
      } else if (fromDate || toDate) {
        // Use explicit fromDate and toDate if provided
        const filterStart = fromDate
          ? new Date(fromDate)
          : new Date("1970-01-01");
        const filterEnd = toDate ? new Date(toDate) : new Date("2099-12-31");

        taskAssignments = taskAssignments.filter((task) =>
          doesProjectOverlapWithPeriod(
            task.assignDate,
            task.deadline,
            filterStart,
            filterEnd,
          ),
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
        projectCategory, // Include in response
      },
    });
  } catch (error) {
    console.error("Error fetching task assignments:", error);
    res.status(500).json({
      message: "Server error while fetching task assignments",
    });
  }
};

export const getUnassignedEmployeesForProject = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { bucketName } = req.query;

    if (!bucketName) {
      return res
        .status(400)
        .json({ message: "Project (bucketName) is required" });
    }

    // Step 1: Get all assigned user IDs for this bucket (project)
    const assignedTasks = await TaskAssignment.find({
      companyId,
      bucketName,
    }).select("assignedTo tagMembers");

    const assignedUserIds = new Set();

    assignedTasks.forEach((task) => {
      assignedUserIds.add(task.assignedTo.toString());
      task.tagMembers.forEach((member) =>
        assignedUserIds.add(member.toString()),
      );
    });

    // Step 2: Fetch users from the same company NOT in assignedUserIds
    const unassignedEmployees = await User.find({
      companyId,
      _id: { $nin: Array.from(assignedUserIds) },
    }).select("firstName lastName email");

    res.status(200).json({
      count: unassignedEmployees.length,
      data: unassignedEmployees,
    });
  } catch (error) {
    console.error("Error fetching unassigned employees:", error);
    res.status(500).json({
      message: "Server error while fetching unassigned employees",
    });
  }
};

export const updateTaskTagMembers = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { tagMembers } = req.body;

    if (!Array.isArray(tagMembers)) {
      return res.status(400).json({
        message: "tagMembers must be an array of user IDs",
      });
    }

    // Fetch the existing task
    const task = await TaskAssignment.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Merge existing tagMembers with new ones and remove duplicates
    const existingMembers = task.tagMembers.map((id) => id.toString());
    const newMembers = tagMembers.map((id) => id.toString());

    const mergedMembers = Array.from(
      new Set([...existingMembers, ...newMembers]),
    );

    // Update the document
    task.tagMembers = mergedMembers;
    const updatedTask = await task.save();

    // Populate the tagMembers
    await updatedTask.populate("tagMembers", "firstName lastName email");

    res.status(200).json({
      message: "Tag members updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("Error updating tag members:", error);
    res.status(500).json({
      message: "Server error while updating tag members",
    });
  }
};

export const removeMemberFromTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { memberId } = req.body;

    if (!taskId || !memberId) {
      return res.status(400).json({
        success: false,
        message: "Task ID and Member ID are required",
      });
    }

    const task = await TaskAssignment.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const memberIndex = task.tagMembers.indexOf(memberId);
    if (memberIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Member is not assigned to this task",
      });
    }

    task.tagMembers.splice(memberIndex, 1);
    const updatedTask = await task.save();

    res.status(200).json({
      success: true,
      message: "Member removed successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
          doesProjectOverlapWithPeriod(
            task.assignDate,
            task.deadline,
            startDate,
            endDate,
          ),
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
    const users = await User.find(
      { companyId },
      "firstName lastName email _id",
    );

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
    const {
      remarkDescription,
      fileUrl,
      filePublicId,
      fileResourceType,
      fileName,
    } = req.body;
    const { companyId, userId } = req.user;

    const task = await TaskAssignment.findOne({
      _id: taskId,
      companyId,
      $or: [
        { assignedTo: userId },
        { assignedBy: userId },
        { tagMembers: userId },
      ],
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

    const updatedTask = await TaskAssignment.findByIdAndUpdate(
      taskId,
      updateData,
      { new: true, runValidators: true },
    )
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
          doesProjectOverlapWithPeriod(
            task.assignDate,
            task.deadline,
            startDate,
            endDate,
          ),
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
        percentages[key] =
          stats.total > 0 ? Math.round((stats[key] / stats.total) * 100) : 0;
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
