import GameRegistration from '../models/gameRegistration.model.js';

export const toggleRegistration = async (req, res) => {
  const { eventId, registeredGames } = req.body;

  try {
    let userId;
    if (req.user) {
      userId = req.user.id || req.user._id || req.user.userId;
    }
    if (!userId) {
      return res.status(400).json({ message: 'User ID could not be determined' });
    }
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }
    if (!Array.isArray(registeredGames) || registeredGames.length === 0) {
      return res.status(400).json({ message: 'registeredGames must be a non-empty array' });
    }

    // Upsert: update if exists, otherwise create
    const registration = await GameRegistration.findOneAndUpdate(
      { eventId, userId },
      { $set: { games: registeredGames } },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: registration });
  } catch (err) {
    console.error('Submit Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const registeredUser = async (req, res) => {
  try {
    const userId = req.user.userId; // coming from protect middleware (token decoded)

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required to fetch registered games",
      });
    }

    const user = await GameRegistration.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or no games registered",
      });
    }

    res.status(200).json({
      success: true,
      message: "User's registered games fetched successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user's registered games",
      error: error.message,
    });
  }
};






