import GameScore from '../models/gameScore.model.js';
import Event from "../models/event.model.js";
import User from "../models/user.model.js";

export const submitScore = async (req, res) => {
  try {
    const { gameName, score, time, eventId } = req.body;
    const userId = req.user._id || req.user.userId || req.user.id;

    if (!gameName || typeof score !== 'number' || typeof time !== 'number' || !userId) {
      return res.status(400).json({ message: 'Missing or invalid required fields' });
    }

    const newScore = new GameScore({
      gameName,
      score,
      time,
      userId,
      eventId
    });

    await newScore.save();

    res.status(201).json({
      message: 'Score submitted successfully',
      data: newScore,
    });
  } catch (error) {
    console.error('Score submission error:', error);
    res.status(500).json({
      message: 'Error submitting score',
      error: error.message,
    });
  }
};

export const getScores = async (req, res) => {
  try {
    const { eventId, userId, gameName } = req.query;
    const filter = {};

    if (userId) filter.userId = userId;
    if (gameName) filter.gameName = gameName;
    if (eventId) filter.eventId = eventId;

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
      });

    const formattedScores = scores.map(score => ({
      userId: score.userId?._id,
      userName: score.userId?.name,
      userEmail: score.userId?.email,
      eventId: score.eventId?._id,
      eventDate: score.eventId?.date,
      gameName: score.gameName,
      score: score.score,
      time: score.time
    }));

    res.status(200).json({ data: formattedScores });
  } catch (error) {
    console.error('❌ Error in getScores:', error);
    res.status(500).json({ message: 'Error fetching scores', error });
  }
};