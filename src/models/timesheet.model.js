import mongoose from "mongoose";


const MAX_TASK_HOURS = 1.5;
const MIN_TOTAL_HOURS = 8;

const taskSchema = new mongoose.Schema({
    task: {
        type: String,
        required: true,
        trim: true
    },
    totalHours: {
        type: Number,
        required: true,
        validate: {
            validator: (v) => v <= MAX_TASK_HOURS,
            message: `Total hours for a task cannot exceed ${MAX_TASK_HOURS} hours`
        }
    },
    hoursToday: {
        type: Number,
        required: true,
        validate: {
            validator: (v) => v <= MAX_TASK_HOURS,
            message: `Today's hours for a task cannot exceed ${MAX_TASK_HOURS} hours`
        }
    }
});

const timesheetSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    description: {
        type: String
    },
    meetings: [taskSchema],
    miscellaneous: [taskSchema],
    notifiedManagers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    totalWorkHours: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Validate min total hours across meetings + miscellaneous
timesheetSchema.pre("validate", function (next) {
    const totalHours =
        this.meetings.reduce((sum, t) => sum + t.totalHours, 0) +
        this.miscellaneous.reduce((sum, t) => sum + t.totalHours, 0);

    if (totalHours < MIN_TOTAL_HOURS) {
        return next(
            new Error(`Total hours (meetings + miscellaneous) must be at least ${MIN_TOTAL_HOURS}`)
        );
    }

    next();
});

export default mongoose.model("Timesheet", timesheetSchema);
