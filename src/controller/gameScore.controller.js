import GameScore from '../models/gameScore.model.js';

// gameScore.controller.js
export const submitScore = async (req, res) => {
  try {
    // eventId,
    const {  gameName, score } = req.body;

    // Get userId from the authenticated user (set by protect middleware)
    // const userId = req.user._id;
    // userId,
      // eventId,
      // !eventId ||

    const newScore = new GameScore({
      gameName,
      score
    });
    // In gameScore.controller.js
    if ( !gameName || typeof score !== 'number') {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    await newScore.save();
    res.status(201).json({
      message: 'Score submitted successfully',
      data: newScore
    });
  } catch (error) {
    console.error('Score submission error:', error);
    res.status(500).json({
      message: 'Error submitting score',
      error: error.message
    });
  }
};

export const getScores = async (req, res) => {
  try {
    const { eventId, userId, gameName } = req.query;
    const filter = {};
    if (eventId) filter.eventId = eventId;
    if (userId) filter.userId = userId;
    if (gameName) filter.gameName = gameName;
    const scores = await GameScore.find(filter).populate('userId').populate('eventId');
    res.status(200).json({ data: scores });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching scores', error });
  }
};