import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // frequently queried
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyRegistration",
      required: true,
      index: true, // filtering by company
    },
    selectedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // for assigning and querying
    },
    title: {
      type: String,
      required: true,
    },
    msg: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved"],
      default: "open",
      index: true, // often filtered
    },
    raisedAt: {
      type: Date,
      default: Date.now,
      index: true, // for sorting/filtering by date
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  },
);

// Compound index for fast filtering per company, user, and status
ticketSchema.index({ companyId: 1, userId: 1, status: 1 });

// Optional: text index for search functionality on title or message
ticketSchema.index({ title: "text", msg: "text" });

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;
