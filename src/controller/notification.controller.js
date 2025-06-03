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
                message: "User Id is required",
            });
        }

        // Fetch all leaves for the user
        const leaves = await Leave.find({ userId }).select("status updatedAt");

        if (!leaves || leaves.length === 0) {
            return res.status(200).json({
                message: "No leave records found for this user.",
            });
        }

        // Utility to check if a date is today
        const isToday = (date) => {
            const today = new Date();
            return (
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear()
            );
        };

        // Filter approved/rejected leaves updated today
        const filteredLeaves = leaves.filter((leave) => {
            return (
                (leave.status === "Approved" || leave.status === "Rejected") &&
                isToday(new Date(leave.updatedAt))
            );
        });

        if (filteredLeaves.length === 0) {
            return res.status(200).json({
                message: "No approved or rejected leaves updated today.",
                notifications: [],
            });
        }

        // Format notifications
        const notifications = filteredLeaves.map((leave) => {
            const istDate = new Date(leave.updatedAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
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
                updatedAt: istDate,
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
                message: "User ID, Company ID, and Position are required.",
            });
        }

        // Fetch posts where position matches or is 'all'
        const posts = await Post.find({
            companyId,
            status: 'published',
            $or: [
                { 'targetAudience.positions': 'all' },
                { 'targetAudience.positions': position },
            ],
        })
            .select("message createdAt")
            .sort({ createdAt: -1 });

        if (!posts || posts.length === 0) {
            return res.status(200).json({
                message: "No new posts available.",
                notifications: [],
            });
        }

        // Utility to check if a date is today
        const isToday = (date) => {
            const today = new Date();
            return (
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear()
            );
        };

        // Filter posts created today
        const todaysPosts = posts.filter(post => isToday(new Date(post.createdAt)));

        if (todaysPosts.length === 0) {
            return res.status(200).json({
                message: "No new posts today.",
                notifications: [],
            });
        }

        // Format posts with IST time
        const notifications = todaysPosts.map(post => {
            const istCreatedAt = new Date(post.createdAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
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
            error: error.message,
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
                message: "No approved or rejected expenses found.",
                notifications: []
            });
        }

        // Utility to check if a date is today
        const isToday = (date) => {
            const today = new Date();
            return (
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear()
            );
        };

        // Filter expenses where updatedAt is today
        const todaysExpenses = expenses.filter(exp => isToday(new Date(exp.updatedAt)));

        if (todaysExpenses.length === 0) {
            return res.status(200).json({
                message: "No expense updates today.",
                notifications: []
            });
        }

        // Format notifications
        const notifications = todaysExpenses.map(expense => {
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

        return res.status(200).json({ notifications });

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

        // Helper to check if a date is today
        const isToday = (date) => {
            const today = new Date();
            return (
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear()
            );
        };

        // Filter entries where createdAt is today
        const todaysEntries = calendarEntries.filter(entry => isToday(new Date(entry.createdAt)));

        if (todaysEntries.length === 0) {
            return res.status(200).json({
                message: "No calendar notifications for today",
                notifications: [],
            });
        }

        // Format today's entries
        const notifications = todaysEntries.map(entry => ({
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

        return res.status(200).json({ notifications });

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
        const  userId  = req.user.userId || req.user.adminId;
        console.log(userId)
        if (!userId) {
            return res.status(400).json({
                message: "User ID is required",
            });
        }

        // Find meetings where the user is a participant
        const meetings = await meetingModel.find({
            participants: userId
        }).select("title hostname time meetingLink duration date created_at participants");

        if (!meetings || meetings.length === 0) {
            return res.status(200).json({
                message: "No meeting notifications found",
                notifications: [],
            });
        }

        // Check if date is today
        const isToday = (date) => {
            const today = new Date();
            return (
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear()
            );
        };

        // Filter meetings created today
        const todaysMeetings = meetings.filter(meeting =>
            isToday(new Date(meeting.created_at))
        );

        if (todaysMeetings.length === 0) {
            return res.status(200).json({
                message: "No meeting notifications for today",
                notifications: [],
            });
        }

        // Format notifications
        const notifications = todaysMeetings.map(meeting => ({
            title: meeting.title,
            date : meeting.date,
            time: meeting.time,
            duration: meeting.duration,
            meetingLink: meeting.meetingLink,
            hostname: meeting.hostname,
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

        return res.status(200).json({ notifications });

    } catch (error) {
        console.error("Error sending meeting notification", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message,
        });
    }
};


//admin side notifications

export const adminSendNotification = async (req, res) => {
    try {
        const { companyId } = req.user;

        if (!companyId) {
            return res.status(404).json({
                message: "Company ID is required"
            });
        }

        const leaves = await Leave.find({ companyId }).select("createdAt status");

        // console.log(leaves);

        if (!leaves || leaves.length === 0) {
            return res.status(200).json({
                message: "No leave requests from the employees.",
                notifications: []
            });
        }



        // Check if the date is today
        const isToday = (date) => {
            const today = new Date();
            return (
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear()
            );
        };

        // Filter for today's pending leaves
        const todaysPendingLeaves = leaves.filter(leave =>
            isToday(new Date(leave.createdAt)) && leave.status === 'Pending'
        );

        if (todaysPendingLeaves.length === 0) {
            return res.status(200).json({
                message: "No new leave requests for today.",
                notifications: []
            });
        }

        // Format notifications
        const notifications = todaysPendingLeaves.map(leave => ({
            message: "New leave request",
            createdAt: new Date(leave.createdAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            }),
            status: leave.status
        }));


        return res.status(200).json({ notifications });

    } catch (error) {
        console.error("Error fetching the admin-side leave notification", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};

export const adminExpenseNotification = async (req, res) => {
    try {
        const { companyId } = req.user;

        if (!companyId) {
            return res.status(404).json({
                message: 'Company ID is required'
            });
        }

        const expense = await Expense.find({ companyId }).select("status createdAt");

        if (!expense || expense.length === 0) {
            return res.status(200).json({
                message: "No expense requests found.",
                notifications: []
            });
        }

        // Fix: Add missing parentheses to getFullYear()
        const isToday = (date) => {
            const today = new Date();
            return (
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear()
            );
        };

        const todaysPendingExpenses = expense.filter(exp =>
            isToday(new Date(exp.createdAt)) && exp.status === "pending"
        );

        if (todaysPendingExpenses.length === 0) {
            return res.status(200).json({
                message: "No new expense requests for today.",
                notifications: []
            });
        }

        const notifications = todaysPendingExpenses.map(exp => ({
            message: "New Expense Request",
            createdAt: new Date(exp.createdAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            }),
            status: exp.status
        }));

        return res.status(200).json({ notifications });

    } catch (error) {
        console.error("Error sending expense to admin notification", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};


export const adminCalendarNotification = async (req, res) => {
    try {

        const { companyId } = req.user;

        if (!companyId) {
            return res.status(404).json({
                message: 'Company Id is required'
            })
        }

        const calendar = await CalendarAdminEntry.find({ companyId }).select("type title date")

        const isToday = (date) => {
            const today = new Date();
            return (
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear()
            )
        };

        const todayCalendar = calendar.filter(cal => isToday(new Date(cal.date)))

        if (todayCalendar.length === 0) {
            return res.status(200).json({
                message: "No new Calendar Event",
                notifications: []
            })
        }

        const notifications = todayCalendar.map(cal => ({
            message: "New Calendar Notification",
            date: cal.date,
            title: cal.title,
            type: cal.type,
        }))

        return res.status(200).json({ notifications })


    } catch (error) {
        console.error("Error sending calendar notification to admin", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        })
    }
}