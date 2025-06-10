import GameScore from '../models/gameScore.model.js';
import Event from "../models/event.model.js";
import User from "../models/user.model.js";

export const submitScore = async (req, res) => {
  try {
    const { gameName, score, time, roomId, gameType, players, winnerUserId } = req.body;

    // Enhanced validation
    if (!gameName) {
      return res.status(400).json({ message: "Game name is required" });
    }

    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }

    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ message: "No players provided" });
    }

    if (!winnerUserId) {
      return res.status(400).json({ message: "Winner user ID is required" });
    }

    // Validate that winnerUserId exists in players array
    const winnerExists = players.some(player => player.userId === winnerUserId);
    if (!winnerExists) {
      return res.status(400).json({ message: "Winner user ID not found in players list" });
    }

    console.log("Processing score submission:", {
      gameName,
      roomId,
      gameType,
      players: players.map(p => ({ userId: p.userId, name: p.name, symbol: p.symbol })),
      winnerUserId
    });

    // Create documents for each player
    const docs = players.map((player) => ({
      gameName,
      score: player.userId === winnerUserId ? (score || 1) : 0, // Winner gets the score, others get 0
      time: time || 0,
      roomId,
      userId: player.userId,
      playerName: player.name,
      gameType: gameType || 'multiplayer',
      isWinner: player.userId === winnerUserId,
      // Add any additional fields your schema might need
      createdAt: new Date()
    }));

    console.log("Documents to insert:", docs);

    // Insert all documents
    const savedScores = await GameScore.insertMany(docs);

    console.log("Successfully saved scores:", savedScores.length, "documents");

    return res.status(201).json({
      message: "Scores saved successfully",
      savedCount: savedScores.length,
      scores: savedScores
    });

  } catch (error) {
    console.error("Failed to save game scores:", error);
    return res.status(500).json({
      message: "Failed to save scores",
      error: error.message
    });
  }
};

export const getScores = async (req, res) => {
  try {
    const { eventId, userId, gameName, roomId } = req.query;
    const filter = {};

    if (userId) filter.userId = userId;
    if (gameName) filter.gameName = gameName;
    if (eventId) filter.eventId = eventId;
    if (roomId) filter.roomId = roomId;

    console.log("Fetching scores with filter:", filter);

    const scores = await GameScore.find(filter)
      .populate({
        path: 'userId',
        model: 'User',
        select: 'name email'
      })
      .populate({
        path: 'eventId',
        model: 'Event',
        select: 'date game'
      })
      .sort({ createdAt: -1 });

    const formattedScores = scores.map(score => ({
      id: score._id,
      userId: score.userId?._id,
      userName: score.userId?.name || score.playerName,
      userEmail: score.userId?.email,
      eventId: score.eventId?._id,
      eventDate: score.eventId?.date,
      gameName: score.gameName,
      score: score.score,
      time: score.time,
      roomId: score.roomId,
      playerName: score.playerName,
      gameType: score.gameType,
      isWinner: score.isWinner,
      createdAt: score.createdAt
    }));

    console.log("Returning scores:", formattedScores.length, "records");

    res.status(200).json({
      data: formattedScores,
      count: formattedScores.length
    });

  } catch (error) {
    console.error('❌ Error in getScores:', error);
    res.status(500).json({
      message: 'Error fetching scores',
      error: error.message
    });
  }
};