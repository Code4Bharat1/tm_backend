import mongoose from 'mongoose';

// eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
// userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

const gameScoreSchema = new mongoose.Schema({
  gameName: { type: String, required: true },
  score: { type: Number, required: true },
  time: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model('GameScore', gameScoreSchema);