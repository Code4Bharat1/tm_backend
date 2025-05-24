import mongoose from "mongoose";

const scoreItemSchema = new mongoose.Schema(
  {
    timesheetScore: { type: Number, default: 0 },
    attendanceScore: { type: Number, default: 0 },
    behaviourScore: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
  },
  { _id: false },
);

const performanceScoreSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyRegistration",
      required: true,
    },
    weekStart: {
      type: Date,
      required: true,
    },
    weekEnd: {
      type: Date,
      required: true,
    },
    remark: {
      type: String,
      default: "",
    },
    score: [scoreItemSchema], // To track weekly scores
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("PerformanceScore", performanceScoreSchema);
