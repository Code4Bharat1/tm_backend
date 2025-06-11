import Event from '../models/event.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';

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

export const getUserGames = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    const { eventId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID not found in token'
      });
    }

    const objectUserId =
      typeof userId === 'string'
        ? new mongoose.Types.ObjectId(userId)
        : userId;

    const query = {
      participants: objectUserId,
      game: { $exists: true, $ne: null, $ne: "" }
    };

    if (eventId) {
      query._id = eventId;
    } else {
      // Get today's start and end timestamps
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const events = await Event.find(query).select('game');

    const userGamesSet = new Set();
    events.forEach(event => {
      if (event.game) {
        userGamesSet.add(event.game);
      }
    });

    const userGames = Array.from(userGamesSet);

    res.status(200).json({
      success: true,
      games: userGames
    });
  } catch (error) {
    console.error("❌ Error in getUserGames:", error);
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

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    await Event.findByIdAndDelete(id);
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete event", error: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Received update body:", req.body);
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

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      {
        title,
        date: new Date(date),
        time,
        game,
        participants: participantIds
      },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    console.log("Event updated successfully:", updatedEvent);

    res.json({
      message: "Event updated successfully",
      event: updatedEvent
    });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({
      message: "Failed to update event",
      error: error.message
    });
  }
};


export const getAllEventUserName = async (req, res) => {
  try {
    const { companyId } = req.user;

    const users = await User.find(
      { companyId },
      "firstName lastName email _id position"
    ).sort({ firstName: 1 });

    const updatedUsers = users.map((user) => ({
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      userId: user._id,
      position: user.position
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