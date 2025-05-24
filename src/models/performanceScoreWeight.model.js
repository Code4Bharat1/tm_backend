import mongoose from "mongoose";

const performanceScoreWeightSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyRegistration",
      required: true,
      unique: true,
    },
    attendanceWeight: {
      type: Number,
      default: 4,
      min: 0,
      max: 10,
    },
    timesheetWeight: {
      type: Number,
      default: 4,
      min: 0,
      max: 10,
    },
    behaviourWeight: {
      type: Number,
      default: 2,
      min: 0,
      max: 10,
    },
  },
  {
    timestamps: true,
  },
);

// Custom validation to ensure the total is always 10
performanceScoreWeightSchema.pre("save", function (next) {
  const total =
    this.attendanceWeight + this.timesheetWeight + this.behaviourWeight;
  if (total !== 10) {
    return next(
      new Error(
        `The sum of attendance, timesheet, and behaviour weights must be 10. Currently: ${total}`,
      ),
    );
  }
  next();
});

performanceScoreWeightSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  const attendance = update.attendanceWeight ?? this._update.attendanceWeight;
  const timesheet = update.timesheetWeight ?? this._update.timesheetWeight;
  const behaviour = update.behaviourWeight ?? this._update.behaviourWeight;
  const total = attendance + timesheet + behaviour;

  if (total !== 10) {
    return next(
      new Error(
        `The sum of attendance, timesheet, and behaviour weights must be 10. Currently: ${total}`,
      ),
    );
  }
  next();
});

const PerformanceScoreWeight = mongoose.model(
  "PerformanceScoreWeight",
  performanceScoreWeightSchema,
);

export default PerformanceScoreWeight;
