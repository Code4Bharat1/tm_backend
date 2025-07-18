import Reminder from '../models/reminder.model.js';
import { uploadFileToWasabi } from '../utils/wasabi.utils.js';

export const createReminder = async (req, res) => {
    try {
        const { name, date } = req.body;
        const {  companyId } = req.user;
        const userId = req.user.userId || req.user.adminId;
        if (!name || !date) {
            return res.status(400).json({ success: false, error: "Name and date are required" });
        }

        const uploadedFiles = await Promise.all(
            req.files.map((file) => uploadFileToWasabi({
                buffer: file.buffer,
                originalName: file.originalname,
                folder: `reminders/${req.user.companyId}`,
                mimetype: file.mimetype
            }))
        );

        const documentUrls = uploadedFiles.map((f) => f.fileUrl);

        const reminder = new Reminder({
            name,
            date,
            documents: documentUrls,
            userId,
            companyId,
        });

        await reminder.save();

        res.status(201).json({ success: true, data: reminder });
    } catch (error) {
        console.error("Create Reminder Error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

export const getReminders = async (req, res) => {
    try {
        const  userId = req.user.userId || req.user.adminId;
        let query = { userId };
        console.log(userId)


        const reminders = await Reminder.find(query).sort({ createdAt: -1 });
        res.json({ success: true, data: reminders });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch reminders" });
    }
};


export const updateReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const updateData = req.body;

        const allowedUpdates = ['name', 'date', 'isCompleted'];
        const updates = Object.keys(updateData);
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({
                success: false,
                error: 'Invalid update fields'
            });
        }


        if (updateData.date) {
            const reminderDate = new Date(updateData.date);
            if (isNaN(reminderDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date format'
                });
            }
            updateData.date = reminderDate;
        }

        updateData.updatedAt = new Date();

        const reminder = await Reminder.findOneAndUpdate(
            { _id: id },
            updateData,
            { new: true, runValidators: true }
        );

        if (!reminder) {
            return res.status(404).json({
                success: false,
                error: 'Reminder not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Reminder updated successfully',
            data: reminder
        });

    } catch (error) {
        console.error('Error updating reminder:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while updating reminder'
        });
    }
};


export const deleteReminder = async (req, res) => {
    try {
        const { id } = req.params;
        
        const userId = req.user.id;

        const reminder = await Reminder.findOneAndDelete({ _id: id });

        if (!reminder) {
            return res.status(404).json({
                success: false,
                error: 'Reminder not found'
            });
        }

        if (reminder.documents && reminder.documents.length > 0) {
            reminder.documents.forEach(doc => {
                if (doc.path && fs.existsSync(doc.path)) {
                    fs.unlink(doc.path, (err) => {
                        if (err) {
                            console.error('Error deleting file:', doc.path, err);
                        } else {
                            console.log('Successfully deleted file:', doc.path);
                        }
                    });
                }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Reminder deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while deleting reminder'
        });
    }
};