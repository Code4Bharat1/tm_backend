import Event from '../models/event.model.js';
import User from '../models/user.model.js';
import GameScore from "../models/gameScore.model.js";
import mongoose from 'mongoose';

export const createEvent = async (req, res) => {
  try {
    console.log("Received request body.", req.body);

    const { title, date, time, game, participants } = req.body;

    // Validate required fields
    if (!title || !date || !time) {
      return res.status(400).json({ message: "Title, date, and time are required" });
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
          console.error("Failed to parse participants string.", participants);
          return res.status(400).json({ message: "Invalid participants format" });
        }
      }
    }

    console.log("Processed participant IDs.", participantIds);

    const newEvent = new Event({ 
      companyId: req.user.companyId,
      title,
      date: new Date(date),
      time,
      game,
      participants: participantIds
    });

    const savedEvent = await newEvent.save();

    res.status(201).json(savedEvent);
  } catch (error) {
    console.error("Create event error.", error);
    res.status(500).json({ message: "Failed to create event", error: error.message });
  }
};

export const getUserGames = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID not found in token' });
    }

    const objectUserId = new mongoose.Types.ObjectId(userId);
    const companyId = req.user.companyId;

    const query = {
      participants: objectUserId,
      game: { $exists: true, $ne: '' },
      companyId
    };

    const { eventId } = req.query;

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

    res.status(200).json({ success: true, games: Array.from(userGamesSet) });
  } catch (error) {
    console.error("❌ Error in getUserGames.", error);
    res.status(500).json({ success: false, message: 'Failed to fetch user games', error: error.message });
  }
};

export const getAllEvents = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const events = await Event.find({ companyId }).sort({ createdAt: -1 });

    res.json({ events });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch events", error: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findOne({ _id: id, companyId: req.user.companyId });

    if (!event) {
      return res.status(404).json({ message: "Event not found or not authorized" });
    }

    await event.deleteOne();

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete event", error: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Received update body.", req.body);

    const { title, date, time, game, participants } = req.body;

    // Validate required fields
    if (!title || !date || !time) {
      return res.status(400).json({ message: "Title, date, and time are required" });
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
          console.error("Failed to parse participants.", participants);
          return res.status(400).json({ message: "Invalid participants format" });
        }
      }
    }

    console.log("Processed participant IDs.", participantIds);

    // Find event by id and companyId
    const updatedEvent = await Event.findOneAndUpdate(
      { _id: id, companyId: req.user.companyId },
      {
        title,
        date: new Date(date),
        time,
        game,
        participants: participantIds
      },
      { new: true }
    );

    if (!(updatedEvent)) {
      return res.status(404).json({ message: "Event not found or not authorized" });
    }

    res.json({ message: "Event updated successfully", event: updatedEvent });
  } catch (error) {
    console.error("Update event error.", error);
    res.status(500).json({ message: "Failed to update event", error: error.message });
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

    res.status(200).json({ message: "User details retrieved successfully", count: updatedUsers.length, data: updatedUsers });
  } catch (error) {
    console.error("Error fetching user details.", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const events = await Event.find({ companyId }).sort({ createdAt: -1 });

    const historyWithWinners = await Promise.all(
      events.map(async (event) => {
        // Step 1: Fetch participant details
        const participantDetails = await User.find({ _id: { $in: event.participants } }).select("firstName email");

        // STEP 2: Get all scores for this event
        const scores = await GameScore.find({ eventId: event._id }).sort({ score: -1 });

        // STEP 3: Winner details
        let winner = null;
        if (scores.length) {
          const topScore = scores[0];
          const user = await User.findById(topScore.userId);
          winner = {
            userId: user._id,
            name: user.firstName,
            email: user.email,
            score: topScore.score,
          };
        }

        return {
          ...event.toObject(), 
          participants: participantDetails.map((user) => ({
            userId: user._id,
            name: user.firstName,
            email: user.email,
          })),
          winner,
        };
      })
    );

    res.status(200).json(historyWithWinners);
  } catch (error) {
    console.error("Error fetching event history.", error);
    res.status(500).json({ message: "Failed to fetch event history" });
  }
};