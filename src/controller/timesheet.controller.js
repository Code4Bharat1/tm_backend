import Timesheet from "../models/timesheet.model.js";

// Store Timesheet Controller
const storeTimesheet = async (req, res) => {
    try {
        const {
            userId,
            date,
            description,
            meetings = [],
            miscellaneous = [],
            notifiedManagers = []
        } = req.body;

        // Validate that no individual task exceeds 1.5 hours
        const exceedsTaskLimit = [...meetings, ...miscellaneous].some(
            (task) => task.totalHours > 1.5 || task.hoursToday > 1.5
        );
        if (exceedsTaskLimit) {
            return res.status(400).json({
                message: "Each task must not exceed 1.5 hours for both totalHours and hoursToday."
            });
        }

        // Calculate total work hours
        const totalWorkHours = [...meetings, ...miscellaneous].reduce(
            (sum, task) => sum + task.totalHours,
            0
        );

        // Ensure total hours ≥ 8
        if (totalWorkHours < 8) {
            return res.status(400).json({
                message: "Total work hours (meetings + miscellaneous) must be at least 8."
            });
        }

        // Create and save the timesheet
        const timesheet = new Timesheet({
            userId,
            date,
            description,
            meetings,
            miscellaneous,
            notifiedManagers,
            totalWorkHours
        });

        await timesheet.save();

        return res.status(201).json({
            message: "Timesheet submitted successfully.",
            timesheet
        });

    } catch (error) {
        console.error("Error saving timesheet:", error);
        return res.status(500).json({
            message: "Server error while saving timesheet."
        });
    }
};

export { storeTimesheet };
