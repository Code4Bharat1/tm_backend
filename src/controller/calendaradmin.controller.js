import mongoose from 'mongoose';
import CalendarAdminEntry from '../models/calendaradmin.model.js';
import User from '../models/user.model.js';

const allowedFields = [
    'userId',
    'userModelType',
    'calType',
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

// Enhanced validation function
const validateEntryData = (data) => {
    const errors = [];
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i;

    // Type validation
    if (!data.type) {
        errors.push('Type is required');
    } else if (!['Event', 'Task', 'Meeting', 'Deadline'].includes(data.type)) {
        errors.push('Invalid entry type');
    }

    // Date validation
    if (!data.date) {
        errors.push('Date is required');
    } else if (isNaN(new Date(data.date))) {
        errors.push('Invalid date format');
    }

    // Type-specific validations
    switch (data.type) {
        case 'Meeting':
            if (!data.startTime) errors.push('Start time is required for meetings');
            if (!data.endTime) errors.push('End time is required for meetings');

            // Validate time format and order
            if (data.startTime && data.endTime) {
                if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
                    errors.push('Meeting times must be in HH:MM AM/PM format');
                } else {
                    const parseTime = (timeStr) => {
                        const [time, period] = timeStr.split(' ');
                        let [hours, minutes] = time.split(':').map(Number);
                        if (period === 'PM' && hours < 12) hours += 12;
                        if (period === 'AM' && hours === 12) hours = 0;
                        return hours * 60 + minutes;
                    };

                    try {
                        const start = parseTime(data.startTime);
                        const end = parseTime(data.endTime);
                        if (start >= end) errors.push('End time must be after start time');
                    } catch (e) {
                        errors.push('Invalid time format for meeting');
                    }
                }
            }

            if (!data.participants?.length) {
                errors.push('At least one participant is required for meetings');
            }
            break;

        case 'Deadline':
            if (!data.title) errors.push('Title is required for deadlines');
            if (!data.time) {
                errors.push('Time is required for deadlines');
            } else if (!timeRegex.test(data.time)) {
                errors.push('Invalid time format for deadline (use HH:MM AM/PM)');
            }
            break;

        case 'Event':
            if (!data.category) {
                errors.push('Category is required for events');
            } else if (!['Meeting', 'Leaves', 'Daily Task', 'Reminder', 'Deadline'].includes(data.category)) {
                errors.push('Invalid event category');
            }
            if (!data.title) errors.push('Title is required for events');
            break;

        case 'Task':
            if (!data.title) errors.push('Title is required for tasks');
            break;
    }

    // General time validation
    if (data.time && !timeRegex.test(data.time)) {
        errors.push('Time must be in HH:MM AM/PM format');
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

export const createCalendarEntryAdmin = async (req, res) => {
    try {
        // Extract adminId and companyId from authenticated user
        const { adminId, companyId } = req.user;

        // Validate required IDs
        if (!adminId || !companyId) {
            return res.status(400).json({ error: "Missing adminId or companyId in request" });
        }

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(adminId) || !mongoose.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }

        // Filter allowed fields from request body
        const data = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                data[field] = req.body[field];
            }
        });

        // Force adminId and companyId from authenticated user
        data.adminId = adminId;
        data.companyId = companyId;

        // Custom validation
        const validationErrors = validateEntryData(data);
        if (validationErrors.length > 0) {
            return res.status(400).json({ errors: validationErrors });
        }

        // Validate and parse date
        const parsedDate = new Date(data.date);
        if (isNaN(parsedDate)) {
            return res.status(400).json({ error: "Invalid date format" });
        }
        data.date = parsedDate;

        // Create and save entry
        const newEntry = new CalendarAdminEntry(data);
        const savedEntry = await newEntry.save();

        res.status(201).json(savedEntry);
    } catch (error) {
        handleControllerError(res, error);
    }
};

export const getCalendarEntriesByUserAdmin = async (req, res) => {
    try {
        const adminId = req.user.adminId;
        const { calType } = req.params;
        const { year, month, day, type } = req.query;

        // Validate admin ID
        if (!mongoose.Types.ObjectId.isValid(adminId)) {
            return res.status(400).json({ error: "Invalid adminId format" });
        }

        // Build query
        const query = { adminId };

        // Validate and add calType to query
        if (calType) {
            const validCalTypes = ['Personal', 'Monthly', 'Yearly'];
            if (!validCalTypes.includes(calType)) {
                return res.status(400).json({ error: "Invalid calType value" });
            }
            query.calType = calType;
        }

        // Date filtering
        if (year || month || day) {
            const startDate = new Date(Date.UTC(
                parseInt(year) || 1970,
                month ? parseInt(month) - 1 : 0,
                day ? parseInt(day) : 1
            ));
            const endDate = new Date(startDate);
            if (day) endDate.setUTCDate(endDate.getUTCDate() + 1);
            else if (month) endDate.setUTCMonth(endDate.getUTCMonth() + 1);
            else endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);

            query.date = {
                $gte: startDate,
                $lt: endDate
            };
        }

        // Type filtering
        if (type) {
            const validTypes = ['Event', 'Task', 'Meeting', 'Deadline'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({ error: "Invalid type filter" });
            }
            query.type = type;
        }

        // Fetch entries
        let entries = await CalendarAdminEntry.find(query)
            .sort({ date: 1, startTime: 1 })
            .lean();

        // Transform entries
        const transformedEntries = entries.map(entry => ({
            adminId: entry.adminId,
            companyId: entry.companyId,
            type: entry.type,
            calType: entry.calType,
            title: entry.title,
            description: entry.description,
            date: entry.date,
            time: entry.time,
            category: entry.category,
            reminder: entry.reminder,
            remindBefore: entry.remindBefore,
            startTime: entry.startTime,
            endTime: entry.endTime,
            participants: entry.participants,
            _id: entry._id,
            createdAt: entry.createdAt,
            __v: entry.__v
        }));

        res.status(200).json(transformedEntries);
    } catch (error) {
        handleControllerError(res, error);
    }
};

export const findUserEmailById = async (req, res) => {
    try {
        // Get company ID from authenticated user
        const companyId = req.user.companyId;

        // Validate company ID format
        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid company ID format"
            });
        }

        // Find all users with matching company ID
        const employees = await User.find({ companyId })
            .select('email firstName lastName _id') // Include names if needed
            .lean();

        // Handle no employees found
        if (!employees.length) {
            return res.status(404).json({
                success: false,
                message: "No employees found for this company"
            });
        }

        // Extract and format emails
        const emails = employees.map(user => ({
            id: user._id.toString(),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`
        }));

        res.status(200).json({
            success: true,
            count: emails.length,
            data: emails
        });

    } catch (error) {
        console.error("Error fetching company emails:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
export const getCalendarEntryByIdAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid entry ID format" });
        }

        const entry = await CalendarAdminEntry.findById(id)
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

export const updateCalendarEntryAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = Object.fromEntries(
            Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
        );

        // Validate entry ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid entry ID format" });
        }

        // Custom validation
        const validationErrors = validateEntryData(updates);
        if (validationErrors.length > 0) {
            return res.status(400).json({ errors: validationErrors });
        }

        // Process date updates
        if (updates.date) {
            updates.date = new Date(updates.date);
            if (isNaN(updates.date)) {
                return res.status(400).json({ error: "Invalid date format" });
            }
        }

        // Perform update
        const updatedEntry = await CalendarAdminEntry.findByIdAndUpdate(
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

export const deleteCalendarEntryAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid entry ID format" });
        }

        const deletedEntry = await CalendarAdminEntry.findByIdAndDelete(id);

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

export default {
    createCalendarEntryAdmin,
    getCalendarEntriesByUserAdmin,
    getCalendarEntryByIdAdmin,
    updateCalendarEntryAdmin,
    deleteCalendarEntryAdmin,
    findUserEmailById,
};