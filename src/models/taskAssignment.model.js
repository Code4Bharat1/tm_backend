// models/TaskAssignment.js
import mongoose from "mongoose";

const taskAssignmentSchema = new mongoose.Schema({
  bucketName: {
    type: String,
    required: true,
  },
  // New fields for project category and client
  projectCategory: {
    type: String,
    enum: ["Self", "Client"],
    required: true,
    default: "Self",
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: function () {
      return this.projectCategory === "Client";
    },
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CompanyRegistration",
    required: true,
  },
  assignDate: {
    type: Date,
    required: true,
  },
  deadline: {
    type: Date,
    required: true,
  },
  dueTime: {
    type: String,
  },
  priority: {
    type: String,
    enum: ["High", "Medium", "Low"],
    default: "Medium",
  },
  status: {
    type: String,
    enum: ["Open", "In Progress", "Completed", "Deferred", "Closed"],
    default: "Open",
  },
  tagMembers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  attachmentRequired: {
    type: Boolean,
    default: false,
  },
  documents: [
    {
      fileName: String,
      fileUrl: String,
      filePublicId: String,
      fileResourceType: String,
      _id: false,
    },
  ],
  taskDescription: {
    type: String,
    required: true,
  },
  remark: {
    type: String,
  },
  remarkDescription: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
taskAssignmentSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const TaskAssignment = mongoose.model("TaskAssignment", taskAssignmentSchema);

export default TaskAssignment;
