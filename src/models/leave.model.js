import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({
    userId: {
        type: String, // adjust based on your user model
        required: true,
    },
    fromDate: {
        type: Date,
        required: true,
    },
    toDate: {
        type: Date,
        required: true,
    },
    leaveType: {
        type: String,
        enum: ["Sick", "Casual", "Earned", "Maternity", "Paternity", "Other"],
        required: true,
    },
    managerId: {
        type: String,
        required: true,
        default: null,
        
    },
    attachment: {
        type: String, // File name or file path
        default: null,
    },
    reason: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Leave = mongoose.model("Leave", leaveSchema);

export default Leave;
