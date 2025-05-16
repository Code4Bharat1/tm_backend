// models/TaskAssignment.js
import mongoose from 'mongoose';

const taskAssignmentSchema = new mongoose.Schema({
  bucketName: {
    type: String,
    required: true,
  },
  assignedTo: {
    type: String,
    required: true,
  },
  assignedBy: {
    type: String,
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
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Completed', 'Deferred'],
    default: 'Open',
  },
  tagMember: {
    type: String,
  },
  attachmentRequired: {
    type: Boolean,
    default: false,
  },
  recurring: {
    type: Boolean,
    default: false,
  },
  taskDescription: {
    type: String,
    required: true,
  },
  remark: {
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
taskAssignmentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const TaskAssignment = mongoose.model('TaskAssignment', taskAssignmentSchema);

export default TaskAssignment;
