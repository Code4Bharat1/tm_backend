// controllers/taskController.js
import TaskAssignment from "../models/taskAssignment.model.js";
import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";
import mongoose from "mongoose";
import axios from "axios";

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
    if (
      !bucketName ||
      !assignedTo ||
      !assignDate ||
      !deadline ||
      !taskDescription
    ) {
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

export const getTaskAssignments = async (req, res) => {
  try {
    // Get companyId and userId from the JWT token
    const { companyId, userId } = req.user;

    // Optional query parameters for filtering
    const { status, assignedTo, fromDate, toDate } = req.query;

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
      if (fromDate) query.assignDate.$gte = new Date(fromDate);
      if (toDate) query.assignDate.$lte = new Date(toDate);
    }

    const taskAssignments = await TaskAssignment.find(query)
      .populate("assignedTo", "firstName lastName email")
      .populate("assignedBy", "fullName email")
      .populate("tagMembers", "firstName lastName email")
      .sort({ assignDate: -1 })
      .lean();

    res.status(200).json({
      count: taskAssignments.length,
      data: taskAssignments,
    });
  } catch (error) {
    console.error("Error fetching task assignments:", error);
    res.status(500).json({
      message: "Server error while fetching task assignments",
    });
  }
};

export const getOngoingProjects = async (req, res) => {
  try {
    const { companyId } = req.user;

    const ongoingTasks = await TaskAssignment.find({
      companyId,
      status: { $in: ["Open", "In Progress"] },
    })
      .select("bucketName taskDescription assignedTo") // only select required fields
      .populate("assignedTo", "firstName lastName photoUrl") // populate assignedTo with fields
      .lean();

    const result = ongoingTasks.map((task) => ({
      assignedToName: task.assignedTo
        ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
        : "Unassigned",
      bucketName: task.bucketName,
      taskDescription: task.taskDescription,
      photoUrl: task.assignedTo?.photoUrl || "", // ✅ Fix: access photoUrl via assignedTo
    }));

    res.status(200).json({
      count: result.length,
      data: result,
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
    const { remarkDescription } = req.body;
    const { companyId, userId } = req.user;

    // Find the task
    const task = await TaskAssignment.findOne({
      _id: taskId,
      companyId,
      $or: [
        { assignedTo: userId }, // User is assigned to the task
        { assignedBy: userId }, // User created the task
        { tagMembers: userId }, // User is a tag member
      ],
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found or access denied",
      });
    }

    // Check if task is already closed
    if (task.status === "Closed") {
      return res.status(400).json({
        success: false,
        message: "Task is already closed",
      });
    }

    // Handle file upload if attachment is provided
    let uploadedFile = null;
    if (req.file) {
      try {
        // Convert buffer to Blob
        const blob = new Blob([req.file.buffer], { type: req.file.mimetype });

        const formData = new FormData();
        formData.append("file", blob, req.file.originalname); // Use Blob here

        // Simulated upload response (replace with actual API call)
        uploadedFile = {
          fileName: req.file.originalname,
          fileUrl: `${process.env.CLOUDINARY_URL}/${req.file.filename}`,
          filePublicId: req.file.filename,
          fileResourceType: req.file.mimetype.startsWith("image/")
            ? "image"
            : "raw",
        };
      } catch (uploadError) {
        console.error("Error uploading file:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Error uploading attachment",
        });
      }
    }

    // Check if attachment is required but not provided
    if (task.attachmentRequired && !uploadedFile) {
      return res.status(400).json({
        success: false,
        message: "Attachment is required to close this task",
      });
    }

    // Update the task
    const updateData = {
      status: "Closed",
      remarkDescription: remarkDescription || "",
      updatedAt: new Date(),
    };

    // Add attachment to documents array if uploaded
    if (uploadedFile) {
      updateData.$push = {
        documents: uploadedFile,
      };
    }

    const updatedTask = await TaskAssignment.findByIdAndUpdate(
      taskId,
      updateData,
      { new: true, runValidators: true },
    )
      .populate("assignedTo", "firstName lastName email")
      .populate("assignedBy", "fullName email")
      .populate("tagMembers", "firstName lastName email");

    res.status(200).json({
      success: true,
      message: "Task closed successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("Error closing task:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error while closing task",
    });
  }
};
