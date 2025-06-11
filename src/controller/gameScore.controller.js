import GameScore from '../models/gameScore.model.js';
import Event from "../models/event.model.js";
import User from "../models/user.model.js";
import mongoose from 'mongoose';

export const submitScore = async (req, res) => {
  try {
    const {userId}=req.user;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: user not found in session" });
    }

    const user = await User.findById(userId);


    const { gameName, score, time, roomId, gameType, players, winnerUserId, eventId } = req.body;

    if (!gameName || score == null || time == null) {
      return res.status(400).json({ message: "Missing required fields: gameName, score, or time" });
    }

    // Single-player fallback (no players array, no winner needed)
    const newScore = new GameScore({
      gameName,
      score,
      time,
      userId,
      eventId: eventId || null,
      roomId: roomId || null,
      gameType: gameType || 'single',
      isWinner: false,
      playerName: user?.firstName || 'Unknown',
    });

    await newScore.save();

    return res.status(201).json({
      message: "Score saved successfully",
      score: newScore
    });
  } catch (error) {
    console.error("Failed to save game score:", error);
    return res.status(500).json({
      message: "Failed to save score",
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