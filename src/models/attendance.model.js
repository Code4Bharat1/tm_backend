import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: () => new Date().setHours(0, 0, 0, 0), // normalized to start of day
    },
    punchIn: {
        type: Date,
        default: null,
    },
    punchInLocation: {
        type: String,
        default: null,
    },
    punchOut: {
        type: Date,
        default: null,
    },
    punchOutLocation: {
        type: String,
        default: null,
    },
    totalWorkedHours: {
        type: Number,
        default: 0,
    },
    overtime: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ["Present", "Half-Day", "Emergency", "Pending"],
        default: "Pending",
    },
    emergencyReason: {
        type: String,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    remark: {
        type: String,

        default: "Absent",
    }
}, {
    timestamps: true // adds createdAt and updatedAt
});

export default mongoose.model("Attendance", attendanceSchema);
