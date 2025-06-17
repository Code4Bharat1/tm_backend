import mongoose from "mongoose";

const chessResultSchema = new mongoose.Schema(
    {
        gameName: { type: String, default: 'Chess Multiplayer' },

        // Player info
        userId: { type: String, required: true },              // Winner ID
        playerName: { type: String, required: true },          // Winner Name
        winnerColor: { type: String, enum: ['white', 'black'], required: true },

        // Opponent info
        loserId: { type: String },
        loserName: { type: String },

        // Match context
        roomId: { type: String },
        eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
        gameType: { type: String, default: 'multiplayer' },
        isWinner: { type: Boolean, default: true },
        isPlayed: { type: Boolean, default: true },

        // Performance metrics
        score: { type: Number, default: 0 },
        time: { type: Number, default: 0 }, // Total time in seconds
    },
    { timestamps: true }
);

export default mongoose.model("ChessResult", chessResultSchema);
