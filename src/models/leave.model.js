import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({
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
        // enum: ["Sick", "Casual", "Earned", "Maternity", "Paternity", "Other"],
        required: true,
    },
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User" || "Admin",
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
    days: {
        type: Number,
        //required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Pre-save middleware to calculate the number of days between `fromDate` and `toDate`
leaveSchema.pre('save', function (next) {
    if (this.fromDate && this.toDate) {
        // Calculate the difference in days
        const diffTime = new Date(this.toDate) - new Date(this.fromDate);
        const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24)); // Convert time difference to days
        this.days = diffDays >= 0 ? diffDays : 0; // Ensure the number of days is non-negative
    }
    next();
});

const Leave = mongoose.model("Leave", leaveSchema);

export default Leave;
