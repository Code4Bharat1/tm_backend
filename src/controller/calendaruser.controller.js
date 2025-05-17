import mongoose from 'mongoose';
import CalendarEntry from '../models/calendaruser.model.js';

const allowedFields = [
    'userId',
    'type',
    'title',
    'description',
    'date',
    'time',
    'category',
    'reminder',
    'remindBefore',
    'startTime',
    'endTime',
    'participants'
];

const validateEntryData = (data) => {
    const errors = [];
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i;

    // Type validation
    if (!data.type) {
        errors.push('Type is required');
    } else if (!['Event', 'Task', 'Meeting', 'Deadline'].includes(data.type)) {
        errors.push('Invalid entry type');
    }

    // Common validations
    if (data.date && isNaN(new Date(data.date))) {
        errors.push('Invalid date format');
    }

    // Type-specific validations
    switch(data.type) {
        case 'Meeting':
            if (!data.startTime) errors.push('Start time is required for meetings');
            if (!data.endTime) errors.push('End time is required for meetings');
            if (data.startTime && data.endTime && data.startTime >= data.endTime) {
                errors.push('End time must be after start time');
            }
            if (!data.participants?.length) {
                errors.push('At least one participant is required for meetings');
            }
            break;
            
        case 'Deadline':
            if (!data.title) errors.push('Title is required for deadlines');
            if (!data.time) errors.push('Time is required for deadlines');
            if (data.time && !timeRegex.test(data.time)) {
                errors.push('Invalid time format (use HH:MM AM/PM)');
            }
            break;
            
        case 'Event':
            if (!data.category) errors.push('Category is required for events');
            if (!data.title) errors.push('Title is required for events');
            if (data.category && !['Meeting', 'Leave', 'Daily Task', 'Reminder', 'Deadline'].includes(data.category)) {
                errors.push('Invalid event category');
            }
            break;
            
        case 'Task':
            if (!data.title) errors.push('Title is required for tasks');
            break;
    }

    // Time format validation
    if (data.time && !timeRegex.test(data.time)) {
        errors.push('Invalid time format (use HH:MM AM/PM)');
    }

    return errors;
};

const handleControllerError = (res, error) => {
    console.error('Controller Error:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ errors: messages });
    }
    
    if (error.name === 'CastError') {
        return res.status(400).json({ error: "Invalid ID format" });
    }
    
    res.status(500).json({ 
        error: "Server error", 
        details: error.message 
    });
};

export const createCalendarEntry = async (req, res) => {
    try {
        // Filter input data
        const data = Object.fromEntries(
            Object.entries(req.body)
                .filter(([key]) => allowedFields.includes(key))
        );

        // Validate data
        const validationErrors = validateEntryData(data);
        if (validationErrors.length > 0) {
            return res.status(400).json({ errors: validationErrors });
        }

        // Convert and validate date
        data.date = new Date(data.date);
        if (isNaN(data.date)) {
            return res.status(400).json({ error: "Invalid date format" });
        }

        // Validate user ID
        if (!mongoose.Types.ObjectId.isValid(data.userId)) {
            return res.status(400).json({ error: "Invalid userId format" });
        }

        // Create and save entry
        const newEntry = new CalendarEntry(data);
        const savedEntry = await newEntry.save();
        
        res.status(201).json(savedEntry);
        
    } catch (error) {
        handleControllerError(res, error);
    }
};

export const getCalendarEntriesByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { year, month, day, type } = req.query;

        // Validate user ID
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid userId format" });
        }

        const query = { userId };
        const dateFilter = {};

        // Date filtering
        if (year || month || day) {
            const startDate = new Date(Date.UTC(
                parseInt(year) || 1970,
                month ? parseInt(month) - 1 : 0,
                day ? parseInt(day) : 1
            ));

            const endDate = new Date(startDate);
            
            if (day) {
                endDate.setUTCDate(endDate.getUTCDate() + 1);
            } else if (month) {
                endDate.setUTCMonth(endDate.getUTCMonth() + 1);
            } else {
                endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);
            }

            query.date = { 
                $gte: startDate.toISOString(), 
                $lt: endDate.toISOString() 
            };
        }

        // Type filtering
        if (type) {
            if (!['Event', 'Task', 'Meeting', 'Deadline'].includes(type)) {
                return res.status(400).json({ error: "Invalid type filter" });
            }
            query.type = type;
        }

        const entries = await CalendarEntry.find(query)
            .populate('userId', 'firstName lastName position')
            .sort({ date: 1, startTime: 1 })
            .lean();

        // Convert dates to local time
        const localizedEntries = entries.map(entry => ({
            ...entry,
            date: new Date(entry.date).toLocaleDateString('en-CA'),
            createdAt: new Date(entry.createdAt).toISOString()
        }));

        res.status(200).json(localizedEntries);

    } catch (error) {
        handleControllerError(res, error);
    }
};

export const getCalendarEntryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid entry ID format" });
        }

        const entry = await CalendarEntry.findById(id)
            .populate('userId', 'firstName lastName position');

        if (!entry) {
            return res.status(404).json({ error: "Entry not found" });
        }

        res.status(200).json({
            ...entry.toObject(),
            date: new Date(entry.date).toLocaleDateString('en-CA'),
            createdAt: entry.createdAt.toISOString()
        });

    } catch (error) {
        handleControllerError(res, error);
    }
};

export const updateCalendarEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = Object.fromEntries(
            Object.entries(req.body)
                .filter(([key]) => allowedFields.includes(key))
        );

        // Validate entry ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid entry ID format" });
        }

        // Validate update data
        const validationErrors = validateEntryData(updates);
        if (validationErrors.length > 0) {
            return res.status(400).json({ errors: validationErrors });
        }

        // Handle date conversion
        if (updates.date) {
            updates.date = new Date(updates.date);
            if (isNaN(updates.date)) {
                return res.status(400).json({ error: "Invalid date format" });
            }
        }

        const updatedEntry = await CalendarEntry.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        ).populate('userId', 'firstName lastName position');

        if (!updatedEntry) {
            return res.status(404).json({ error: "Entry not found" });
        }

        res.status(200).json({
            ...updatedEntry.toObject(),
            date: new Date(updatedEntry.date).toLocaleDateString('en-CA'),
            createdAt: updatedEntry.createdAt.toISOString()
        });

    } catch (error) {
        handleControllerError(res, error);
    }
};

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

        res.status(200).json({
            message: "Entry deleted successfully",
            deletedEntry: {
                ...deletedEntry.toObject(),
                date: new Date(deletedEntry.date).toLocaleDateString('en-CA')
            }
        });

    } catch (error) {
        handleControllerError(res, error);
    }
};