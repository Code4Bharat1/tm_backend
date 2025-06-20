import mongoose from "mongoose";

const ticTacToeScoreSchema = new mongoose.Schema({
    roomId: { type: String, required: true },
    players: [{ type: String }], // array of userIds
    playerNames: { type: Map, of: String }, // userId => name
    winner: { type: String, default: null }, // 'X', 'O', or null (for draw)
    winnerUserId: { type: String, default: null },
    isDraw: { type: Boolean, default: false },
    movesCount: { type: Number },
    gameName: { type: String, default: "Tic Tac Toe Multiplayer" },
    gameType: { type: String, default: "multiplayer" },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("TicTacToeScore", ticTacToeScoreSchema);