import mongoose from "mongoose";

const calendarEntrySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'userModelType',
        required: true,
    },
    userModelType: {
        type: String,
        required: true,
        enum: ['User', 'Admin'],
    },
    type: {
        type: String,
        enum: ["Event", "Task", "Meeting", "Deadline"],
        required: true,
    },
     calType: {
        type: String,
        enum: ['Personal', 'Monthly','Yearly'],
        required: true,
    },
    title: {
        type: String,
        default: null,
    },
    description: {
        type: String,
        default: null,
    },
    date: {
        type: Date,
        required: true,
    },
    time: {
        type: String,
        default: null,
    },
    category: {
        type: String,
        enum: ["Meeting", "Leaves", "Daily Task", "Reminder", "Deadline"],
        default: null,
    },
    reminder: {
        type: Boolean,
        default: false,
    },
    remindBefore: {
        type: Number,
        default: 15,
    },
    startTime: {
        type: String,
        default: null,
    },
    endTime: {
        type: String,
        default: null,
    },
    participants: {
        type: [String],
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Validation middleware for required fields based on type
calendarEntrySchema.pre('validate', function (next) {
    if (this.type === 'Meeting') {
        if (!this.startTime) this.invalidate('startTime', 'Start time required for meetings');
        if (!this.endTime) this.invalidate('endTime', 'End time required for meetings');
        if (this.participants.length === 0) this.invalidate('participants', 'At least one participant required for meetings');
    }

    if (this.type === 'Deadline') {
        if (!this.title) this.invalidate('title', 'Title required for deadlines');
        if (!this.time) this.invalidate('time', 'Time required for deadlines');
    }

    if (this.type === 'Event' && !this.category) {
        this.invalidate('category', 'Category required for events');
    }

    next();
});

const CalendarEntry = mongoose.model("CalendarEntry", calendarEntrySchema);

export default CalendarEntry;