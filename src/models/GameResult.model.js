import mongoose from "mongoose";

const gameResultSchema = new mongoose.Schema({
    roomId: String,
    winner: String,
    winnerId: String,
    players: [String],
    playerNames: Object,
    time: { type: Date, default: Date.now },
});

export default mongoose.models.GameResult || mongoose.model("GameResult", gameResultSchema);
