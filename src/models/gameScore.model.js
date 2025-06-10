import mongoose from 'mongoose';

const gameScoreSchema = new mongoose.Schema({
  gameName: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  time: {
    type: Number,
    required: true,
    default: 0, // Default to 0 if not provided
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null,
  },
  // New fields for multiplayer games
  roomId: {
    type: String,
    default: null,
  },
  playerName: {
    type: String,
    default: null,
  },
  gameType: {
    type: String,
    enum: ['single', 'multiplayer'],
    default: 'single',
  },
  isWinner: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true, // adds createdAt and updatedAt
});

// Index for better query performance
gameScoreSchema.index({ roomId: 1, gameName: 1 });
gameScoreSchema.index({ userId: 1, gameName: 1 });

const GameScore = mongoose.model('GameScore', gameScoreSchema);

export default GameScore;