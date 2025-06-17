import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({ 
  timeRange: {
    type: String,
  }, // Time range of the task
  task: { 
    type: String,
    default: '' 
  }, // Task description
  type: {
    type: String,
    enum: ['Meeting', 'Miscellaneous', 'Work', 'Project'], 
  }, // Type of task
  duration: {
    type: String,
    default: '01:00',
  }, // Duration in format HH:MM
  bucket: {
    type: String,
    default: 'Miscellaneous',
  }, // Category of task
});

// Define the schema for the timesheet
const timesheetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyRegistration',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    }, // The date of the timesheet
    
    projectName: {
      type: String,
      default: '',
    }, // The project name (optional)
    
    items: [taskSchema], // Array of tasks in the timesheet
    
    voiceRecording: {
      url: { type: String, default: '' }, // File path or URL to the voice recording
      duration: { type: Number, default: 0 }, // Duration in seconds
      format: { type: String, default: '' }, // File format (mp3, wav...)
    },
    notifiedManagers: {
      type: [String],
      default: [],
    }, // List of notified managers
    
    totalWorkHours: {
      type: String,
      default: '00:00',
    }, // Total work hours calculated
  },
  { timestamps: true },
);

timesheetSchema.index({ userId: 1, companyId: 1, date: 1 });

// Validation to make sure we don't have both at the same time
timesheetSchema.pre('validate', function (next) {
  if (this.voiceRecording.url && this.items.length > 0) {
    return next(
      new Error('Timesheet cannot have both a voice recording and manually filled tasks.')
    );
  }
  
  if (!this.voiceRecording.url && this.items.length === 0) {
    return next(
      new Error('Timesheet must have either a voice recording or at least 1 task.')
    );
  }

  next();
});

// Create the Timesheet model
const Timesheet = mongoose.model('Timesheet', timesheetSchema);

export default Timesheet;
