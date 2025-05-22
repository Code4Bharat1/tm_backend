import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
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
      type: Date,
      required: true,
      default: () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      },
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
      enum: ['Present', 'Half-Day', 'Emergency', 'Pending', 'Absent'],
      default: 'Pending',
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
      default: 'Absent',
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model('Attendance', attendanceSchema);
