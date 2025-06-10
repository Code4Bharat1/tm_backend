import GameScore from '../models/gameScore.model.js';
import Event from "../models/event.model.js";
import User from "../models/user.model.js";
import mongoose from 'mongoose';

export const submitScore = async (req, res) => {
  try {
    const { gameName, score, time, roomId, gameType, players, winnerUserId } = req.body;

    console.log("Received score submission request:", {
      gameName,
      score,
      time,
      roomId,
      gameType,
      players,
      winnerUserId
    });

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

    // Create or find users for each player
    const processedPlayers = [];

    for (const player of players) {
      let userId = player.userId;

      // If userId is not a valid ObjectId, try to find/create user
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.log(`Invalid ObjectId for user: ${userId}, attempting to find/create user`);

        // Try to find user by name or create a new one
        let user = await User.findOne({ name: player.name });

        if (!user) {
          // Create a new user if not found
          user = new User({
            name: player.name,
            email: `${player.userId}@temp.com`, // Temporary email
            // Add any other required fields for your User model
          });
          await user.save();
          console.log(`Created new user: ${user._id} for ${player.name}`);
        }

        userId = user._id;
      } else {
        // Verify that the ObjectId exists in the database
        const userExists = await User.findById(userId);
        if (!userExists) {
          // Create a new user with the provided ObjectId if it doesn't exist
          const newUser = new User({
            _id: userId,
            name: player.name,
            email: `${player.userId}@temp.com`,
          });
          await newUser.save();
          console.log(`Created user with provided ID: ${userId}`);
        }
      }

      processedPlayers.push({
        ...player,
        userId: userId
      });
    }

    // Update winnerUserId if it was changed during processing
    let processedWinnerUserId = winnerUserId;
    const winnerPlayer = processedPlayers.find(p => p.userId.toString() === winnerUserId || p.userId === winnerUserId);
    if (winnerPlayer) {
      processedWinnerUserId = winnerPlayer.userId;
    }

    // Create documents for each player
    const docs = processedPlayers.map((player) => ({
      gameName,
      score: player.userId.toString() === processedWinnerUserId.toString() ? (score || 1) : 0,
      time: time || 0,
      roomId,
      userId: player.userId,
      playerName: player.name,
      gameType: gameType || 'multiplayer',
      isWinner: player.userId.toString() === processedWinnerUserId.toString(),
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
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

// Additional helper function to create/get user
export const createOrGetUser = async (req, res) => {
  try {
    const { name, tempId } = req.body;

    let user = await User.findOne({ name });

    if (!user) {
      user = new User({
        name,
        email: `${tempId}@temp.com`,
        // Add other required fields
      });
      await user.save();
    }

    res.status(200).json({
      message: "User created/found successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error creating/getting user:', error);
    res.status(500).json({
      message: 'Error creating/getting user',
      error: error.message
    });
  }
};