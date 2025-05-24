//model
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
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
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

// Pre-update hook to validate weights and check 30-day restriction
performanceScoreWeightSchema.pre("findOneAndUpdate", async function (next) {
  try {
    const update = this.getUpdate();
    const query = this.getQuery();

    // Get the existing document
    const existingDoc = await this.model.findOne(query);

    if (existingDoc) {
      // Check 30-day restriction
      const now = new Date();
      const lastUpdated = new Date(existingDoc.updatedAt);
      const daysSinceLastUpdate = Math.floor(
        (now - lastUpdated) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceLastUpdate < 30) {
        return next(
          new Error(
            `Performance weights can only be updated once every 30 days. ${
              30 - daysSinceLastUpdate
            } days remaining.`,
          ),
        );
      }
    }

    // Validate weights sum
    const attendance =
      update.attendanceWeight ?? existingDoc?.attendanceWeight ?? 4;
    const timesheet =
      update.timesheetWeight ?? existingDoc?.timesheetWeight ?? 4;
    const behaviour =
      update.behaviourWeight ?? existingDoc?.behaviourWeight ?? 2;
    const total = attendance + timesheet + behaviour;

    if (total !== 10) {
      return next(
        new Error(
          `The sum of attendance, timesheet, and behaviour weights must be 10. Currently: ${total}`,
        ),
      );
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check if weights can be updated
performanceScoreWeightSchema.methods.canUpdate = function () {
  const now = new Date();
  const lastUpdated = new Date(this.updatedAt);
  const daysSinceLastUpdate = Math.floor(
    (now - lastUpdated) / (1000 * 60 * 60 * 24),
  );

  return daysSinceLastUpdate >= 30;
};

// Instance method to get days until next update
performanceScoreWeightSchema.methods.getDaysUntilNextUpdate = function () {
  const now = new Date();
  const lastUpdated = new Date(this.updatedAt);
  const daysSinceLastUpdate = Math.floor(
    (now - lastUpdated) / (1000 * 60 * 60 * 24),
  );

  return Math.max(0, 30 - daysSinceLastUpdate);
};

const PerformanceScoreWeight = mongoose.model(
  "PerformanceScoreWeight",
  performanceScoreWeightSchema,
);

export default PerformanceScoreWeight;
