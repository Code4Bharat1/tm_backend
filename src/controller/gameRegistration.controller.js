import GameRegistration from '../models/gameRegistration.model.js';

const toggleRegistration = async (req, res) => {
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

export default toggleRegistration;
