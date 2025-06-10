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
}, {
  timestamps: true, // adds createdAt and updatedAt
});

const GameScore = mongoose.model('GameScore', gameScoreSchema);

export default GameScore;
