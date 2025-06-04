import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Ensure 'User' matches the model name
    required: true,
    index: true, // Index for faster querying by user
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyRegistration', // Ensure it matches the model name
    required: true,
    index: true, // Index for filtering by company
  },
  task: {
    type: String,
    required: true,
  },
  date: {
    type: String, // Consider Date type if possible
    required: true,
    index: true, // Indexing date allows for faster date filtering
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  duration: {
    type: String,
  },
  done: {
    type: Boolean,
    default: false,
  },
  expired: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: "To-Do",
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

taskSchema.index({ userId: 1, date: 1 });

const Task = mongoose.model('Task', taskSchema);
export default Task;