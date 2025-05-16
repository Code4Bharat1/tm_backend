import mongoose from 'mongoose';
import CalendarEntry from '../models/calendaruser.model.js';

// Create a new calendar entry (Event, Task, or Meeting)
export const createCalendarEntry = async (req, res) => {
    try {
        const {
            userId,
            type,
            title,
            description,
            date,
            time,
            category,
            reminder,
            remindBefore,
            startTime,
            endTime,
            participants,
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid userId format" });
        }

        const newEntry = new CalendarEntry({
            userId,
            type,
            title,
            description,
            date,
            time,
            category,
            reminder,
            remindBefore,
            startTime,
            endTime,
            participants,
        });

        const savedEntry = await newEntry.save();
        res.status(201).json(savedEntry);
    } catch (error) {
        res.status(500).json({ error: "Failed to create calendar entry", details: error.message });
    }
};

// Get all calendar entries for a user
export const getCalendarEntriesByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid userId format" });
        }

        const entries = await CalendarEntry.find({ userId }).populate('userId', 'firstName lastName email position');
        res.status(200).json(entries);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve entries", details: error.message });
    }
};

// Get single calendar entry by ID
export const getCalendarEntryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid entry ID format" });
        }

        const entry = await CalendarEntry.findById(id).populate('userId', 'firstName lastName email position');
        if (!entry) {
            return res.status(404).json({ error: "Entry not found" });
        }
        res.status(200).json(entry);
    } catch (error) {
        res.status(500).json({ error: "Error retrieving entry", details: error.message });
    }
};

// Update a calendar entry
export const updateCalendarEntry = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid entry ID format" });
        }

        const updatedEntry = await CalendarEntry.findByIdAndUpdate(id, req.body, { new: true }).populate('userId', 'firstName lastName email position');
        if (!updatedEntry) {
            return res.status(404).json({ error: "Entry not found" });
        }
        res.status(200).json(updatedEntry);
    } catch (error) {
        res.status(500).json({ error: "Error updating entry", details: error.message });
    }
};

// Delete a calendar entry
export const deleteCalendarEntry = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid entry ID format" });
        }

        const deletedEntry = await CalendarEntry.findByIdAndDelete(id);
        if (!deletedEntry) {
            return res.status(404).json({ error: "Entry not found" });
        }
        res.status(200).json({ message: "Entry deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting entry", details: error.message });
    }
};
