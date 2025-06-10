import Event from '../models/event.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';
// Save a new event
// Example: event.controller.js

export const createEvent = async (req, res) => {
  try {
    console.log("Received request body:", req.body);
    console.log("Participants:", req.body.participants);
    console.log("Participants type:", typeof req.body.participants);
    console.log("Is participants array:", Array.isArray(req.body.participants));

    const { title, date, time, game, participants } = req.body;

    // Validate required fields
    if (!title || !date || !time) {
      return res.status(400).json({ 
        message: "Title, date, and time are required" 
      });
    }

    // Ensure participants is an array
    let participantIds = [];
    if (participants) {
      if (Array.isArray(participants)) {
        participantIds = participants;
      } else if (typeof participants === 'string') {
        // If it's a string, try to parse it as JSON
        try {
          participantIds = JSON.parse(participants);
        } catch (e) {
          console.error("Failed to parse participants string:", participants);
          return res.status(400).json({ 
            message: "Invalid participants format" 
          });
        }
      }
    }

    console.log("Processed participant IDs:", participantIds);

    const newEvent = new Event({
      title,
      date: new Date(date),
      time,
      game,
      participants: participantIds
    });

    const savedEvent = await newEvent.save();
    console.log("Event saved successfully:", savedEvent);
    
    res.status(201).json(savedEvent);
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({ 
      message: "Failed to create event",
      error: error.message 
    });
  }
};

// Updated getUserGames with detailed debugging
// export const getUserGames = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     console.log("🔍 Debug getUserGames:");
//     console.log("1. Raw userId from req.user:", userId);
//     console.log("2. userId type:", typeof userId);

//     // Ensure userId is an ObjectId
//     const objectUserId = new mongoose.Types.ObjectId(userId);
//     console.log("3. Converted ObjectId:", objectUserId);

//     // First, let's see all events to debug
//     const allEvents = await Event.find({});
//     console.log("4. Total events in database:", allEvents.length);
//     console.log("5. All events:", JSON.stringify(allEvents, null, 2));

//     // Check events where user is participant (without game filter first)
//     const userEvents = await Event.find({
//       participants: objectUserId
//     });
//     console.log("6. Events where user is participant:", userEvents.length);
//     console.log("7. User events:", JSON.stringify(userEvents, null, 2));

//     // Now check with game filter
//     const eventsWithGames = await Event.find({
//       participants: objectUserId,
//       game: { $exists: true, $ne: null, $ne: "" }
//     }).select('game');
//     console.log("8. Events with games:", eventsWithGames.length);
//     console.log("9. Events with games data:", JSON.stringify(eventsWithGames, null, 2));

//     // Extract games
//     const games = eventsWithGames.map((event) => event.game);
//     console.log("10. Extracted games array:", games);

//     // Filter and get unique games
//     const filteredGames = games.filter(Boolean);
//     console.log("11. Filtered games (removed falsy):", filteredGames);

//     const userGames = [...new Set(filteredGames)];
//     console.log("12. Final unique user games:", userGames);

//     res.status(200).json({
//       success: true,
//       games: userGames,
//       debug: {
//         userId: userId,
//         objectUserId: objectUserId.toString(),
//         totalEvents: allEvents.length,
//         userEvents: userEvents.length,
//         eventsWithGames: eventsWithGames.length,
//         extractedGames: games,
//         finalGames: userGames
//       }
//     });
//   } catch (error) {
//     console.error("❌ Error in getUserGames:", error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch user games',
//       error: error.message
//     });
//   }
// };

export const getUserGames = async (req, res) => {
  try {
    // Handle different possible user ID fields
    let userId = req.user._id || req.user.userId || req.user.id;

    console.log('🔍 Debug getUserGames:');
    console.log('1. req.user object:', req.user);
    console.log('2. Extracted userId:', userId);
    console.log('3. userId type:', typeof userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID not found in token'
      });
    }

    // Convert to ObjectId if it's a string
    let objectUserId;
    if (typeof userId === 'string') {
      objectUserId = new mongoose.Types.ObjectId(userId);
    } else {
      objectUserId = userId;
    }

    console.log('4. Final objectUserId:', objectUserId);

    // Fetch events where user is a participant
    const events = await Event.find({
      participants: objectUserId,
      game: { $exists: true, $ne: null, $ne: "" }
    }).select('game');

    console.log('5. Found events:', events);

    // Extract unique games
    const userGames = [
      ...new Set(events.map((event) => event.game).filter(Boolean))
    ];

    console.log('6. Final user games:', userGames);

    res.status(200).json({
      success: true,
      games: userGames
    });
  } catch (error) {
    console.error("Error in getUserGames:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user games',
      error: error.message
    });
  }
};


export const getAllEvents = async (req, res) => {
    try {
        const events = await Event.find().sort({ createdAt: -1 });
        res.json({ events });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch events', error: error.message });
    }
};

// Delete event
export const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await Event.findByIdAndDelete(id);
        res.json({ message: "Event deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete event", error: error.message });
    }
};

// Edit/Update event
export const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, date, games } = req.body;
        const updated = await Event.findByIdAndUpdate(
            id,
            { title, date, games },
            { new: true }
        );
        res.json({ message: "Event updated successfully", event: updated });
    } catch (error) {
        res.status(500).json({ message: "Failed to update event", error: error.message });
    }
};

export const getAllEventUserName = async (req, res) => {
  try {
    const { companyId } = req.user;

    // Fetch users with required fields including position
    const users = await User.find(
      { companyId },
      "firstName lastName email _id position"
    ).sort({ firstName: 1 });

    // Map to desired format including position
    const updatedUsers = users.map((user) => ({
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      userId: user._id,
      position: user.position  // Added position field
    }));

    res.status(200).json({
      message: "User details retrieved successfully",
      count: updatedUsers.length,
      data: updatedUsers,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};