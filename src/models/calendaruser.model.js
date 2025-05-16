import mongoose from "mongoose";

const calendarEntrySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: ["Event", "Task", "Meeting"],
        required: true,
    },

    // Common Fields
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

    // Event-specific
    category: {
        type: String,
        enum: ["Meeting", "Leave", "Daily Task", "Reminder", "Deadlines"],
        default: null,
    },
    reminder: {
        type: Boolean,
        default: false,
    },
    remindBefore: {
        type: Number, // in minutes
        default: 15,
    },

    // Meeting-specific
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

const CalendarEntry = mongoose.model("CalendarEntry", calendarEntrySchema);

export default CalendarEntry;
