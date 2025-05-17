import mongoose from "mongoose";

// Define the schema for tasks
const taskSchema = new mongoose.Schema({
  timeRange: {
    type: String,
    required: true,
  }, // Time range of the task
  task: { type: String, default: "" }, // Task description
  type: {
    type: String,
    enum: ["Meeting", "Miscellaneous", "Work", "Project"],
    required: true,
  }, // Type of task
  duration: {
    type: String,
    default: "01:00",
  }, // Duration in format HH:MM
  bucket: {
    type: String,
    default: "Miscellaneous",
  }, // Category of task (Meeting or Miscellaneous)
});

// Define the schema for the timesheet
const timesheetSchema =
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CompanyRegistration",
        required: true,
      },
      date: {
        type: String,
        required: true,
      }, // The date of the timesheet (format: "YYYY-MM-DD")
      projectName: {
        type: String,
        required: true,
      }, // The project name
      items: [taskSchema], // Array of tasks in the timesheet
      notifiedManagers: {
        type: [String],
        default: [],
      }, // List of notified managers
      totalWorkHours: {
        type: String,
        default: "00:00",
      }, // Total work hours calculated
    },
    { timestamps: true }
  ); // Optionally, track creation and modification times

// Create the Timesheet model from the schema
const Timesheet = mongoose.model(
  "Timesheet",
  timesheetSchema
);

export default Timesheet;
