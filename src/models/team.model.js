import mongoose from "mongoose";

const TeamSchema = new mongoose.Schema(
  {
    bucketName: {
      type: String,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Optional: Add an index if needed (example)
TeamSchema.index({ userId: 1 }); // or any other relevant index

export default mongoose.model("Team", TeamSchema);
