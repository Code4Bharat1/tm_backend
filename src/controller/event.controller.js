import Event from '../models/event.model.js';
import User from '../models/user.model.js';
// Save a new event
export const createEvent = async (req, res) => {
    try {
        const { title, date, description, games } = req.body;

        const event = new Event({
            title,
            date,
            games,
        });

        await event.save();

        res.status(201).json({ message: 'Event created successfully', event });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create event', error: error.message });
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
      "firstName lastName email _id position"  // Added position field
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