import GameResultModel from "../models/GameResult.model";

export const saveGameResultToDB = async ({ roomId, winner, winnerId, players, playerNames }) => {
    if (!roomId || !players || !playerNames) {
        throw new Error("Invalid game result data");
    }

    const result = await GameResult.create({
        roomId,
        winner,
        winnerId,
        players,
        playerNames,
        time: new Date().toISOString(),
    });

    return result;
};

export const saveGameResult = async (req, res) => {
    try {
        const result = await saveGameResultToDB(req.body);
        return res.status(201).json({ message: "Game result saved", result });
    } catch (err) {
        console.error("❌ Error saving result:", err.message);
        return res.status(500).json({ message: err.message });
    }
};

export const getGameResults = async (req, res) => {
    try {
        const results = await GameResult.find().sort({ time: -1 }).limit(20);
        return res.status(200).json(results);
    } catch (err) {
        console.error("❌ Error fetching results:", err.message);
        return res.status(500).json({ message: err.message });
    }
};
