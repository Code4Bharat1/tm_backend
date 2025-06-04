import mongoose from "mongoose";

const GameRegistrationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "events",
    },
    games: [{
      type: String,
      required: true,
    }],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const GameRegistration = mongoose.model(
  "GameRegistration",
  GameRegistrationSchema,
);
export default GameRegistration;
