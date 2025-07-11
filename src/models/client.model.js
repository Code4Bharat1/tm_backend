import mongoose from "mongoose";
import bcrypt from "bcrypt";
const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyRegistration",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/.+@.+\..+/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // prevents it from being returned in queries
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    projectId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TaskAssignment",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);


// 🔍 Instance method to compare password
clientSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 🧠 Optional: compound index
// Compound unique index on companyId + email (to prevent duplicates per company)
clientSchema.index({ companyId: 1, email: 1 }, { unique: true });

const Client = mongoose.model("Client", clientSchema);

export default Client;
