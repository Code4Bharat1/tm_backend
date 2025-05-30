import CalendarAdminEntry from "../models/calendaradmin.model.js";
import Post from "../models/createpost.model.js";
import Expense from "../models/expense.model.js";
import Leave from "../models/leave.model.js";
import meetingModel from "../models/meeting.model.js";

export const sendLeaveNotification = async (req, res) => {
    try {
        const { userId } = req.user;

        if (!userId) {
            return res.status(400).json({
                message: "User Id is required"
            });
        }

        // Fetch all leaves for the user
        const leaves = await Leave.find({ userId }).select("status updatedAt");

        if (!leaves || leaves.length === 0) {
            return res.status(404).json({
                message: "No leave records found for this user."
            });
        }

        // Filter approved and rejected leaves
        const filteredLeaves = leaves.filter(leave =>
            leave.status === "Approved" || leave.status === "Rejected"
        );

        if (filteredLeaves.length === 0) {
            return res.status(200).json({
                message: "No approved or rejected leaves yet."
            });
        }

        // Format each notification
        const notifications = filteredLeaves.map(leave => {
            const istDate = new Date(leave.updatedAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            });

            let message = "";
            if (leave.status === "Approved") {
                message = "Your leave is approved.";
            } else if (leave.status === "Rejected") {
                message = "Your leave has been rejected.";
            }

            return {
                message,
                status: leave.status,
                updatedAt: istDate
            };
        });

        return res.status(200).json({ notifications });

    } catch (error) {
        console.error("Error sending notification:", error);
        return res.status(500).json({
            message: "Error sending message",
            error: error.message,
        });
    }
};


export const sendPostNotification = async (req, res) => {
    try {
        const { userId, companyId, position } = req.user;

        if (!userId || !companyId || !position) {
            return res.status(400).json({
                message: "User ID, Company ID, and Position are required."
            });
        }

        // Fetch posts where position matches or is 'all'
        const posts = await Post.find({
            companyId,
            status: 'published',
            $or: [
                { 'targetAudience.positions': 'all' },
                { 'targetAudience.positions': position }
            ]
        }).select("message createdAt").sort({ createdAt: -1 });

        if (!posts || posts.length === 0) {
            return res.status(200).json({
                message: "No new posts available."
            });
        }

        // Format posts with IST time
        const notifications = posts.map(post => {
            const istCreatedAt = new Date(post.createdAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            });

            return {
                message: "New post available",
                createdAt: istCreatedAt,
            };
        });

        return res.status(200).json({ notifications });

    } catch (error) {
        console.error("Error sending post notification:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};


export const sendExpenseNotification = async (req, res) => {
    try {
        const { userId } = req.user;

        if (!userId) {
            return res.status(400).json({
                message: "User ID is required",
            });
        }

        // Get approved or rejected expenses for the user
        const expenses = await Expense.find({
            userId,
            status: { $in: ['approved', 'rejected'] }
        }).select("status category amount date updatedAt rejectionReason");

        if (!expenses || expenses.length === 0) {
            return res.status(200).json({
                message: "No approved or rejected expenses found."
            });
        }

        // Format notifications
        const notifications = expenses.map(expense => {
            const istUpdatedAt = new Date(expense.updatedAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });

            return {
                message: `Your expense has been ${expense.status}.`,
                category: expense.category,
                amount: expense.amount,
                date: new Date(expense.date).toLocaleDateString("en-IN"),
                updatedAt: istUpdatedAt,
                ...(expense.status === "rejected" && { rejectionReason: expense.rejectionReason })
            };
        });

        return res.status(200).json({
            notifications
        });

    } catch (error) {
        console.error("Error sending Expense Notification", error);
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

export const sendCalendarNotification = async (req, res) => {
    try {
        const { userId } = req.user;

        if (!userId) {
            return res.status(400).json({
                message: "User ID is required",
            });
        }

        // Find calendar entries where the user is a participant
        const calendarEntries = await CalendarAdminEntry.find({
            participants: userId
        }).select("type date createdAt");

        if (!calendarEntries || calendarEntries.length === 0) {
            return res.status(200).json({
                message: "No calendar entries found for the user",
                notifications: [],
            });
        }

        // Format notifications
        const notifications = calendarEntries.map(entry => ({
            type: entry.type,
            date: new Date(entry.date).toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric",
            }),
            createdAt: new Date(entry.createdAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            }),
        }));

        return res.status(200).json({
            notifications,
        });

    } catch (error) {
        console.error("Error sending calendar notification", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const sendMeetingNotification = async (req, res) => {
    try {
        const { userId } = req.user;

        // console.log(userId);

        if (!userId) {
            return res.status(400).json({
                message: "User ID is required",
            });
        }

        // Find meetings where the user is a participant
        const meetings = await meetingModel.find({
            participants: userId
        }).select("title date created_at participants");

        console.log(meetings);


        if (!meetings || meetings.length === 0) {
            return res.status(200).json({
                message: "No meeting notifications found",
                notifications: [],
            });
        }

        // Format notifications
        const notifications = meetings.map(meeting => ({
            title: meeting.title,
            date: new Date(meeting.date).toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric",
            }),
            createdAt: new Date(meeting.created_at).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            }),
        }));

        return res.status(200).json({
            notifications,
        });

    } catch (error) {
        console.error("Error sending meeting notification", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message,
        });
    }
};