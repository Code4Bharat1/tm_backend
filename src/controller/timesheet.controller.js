import Timesheet from "../models/timesheet.model.js";
import moment from "moment";

const getApprovers = async (req, res) => {
    try {
        const { companyId } = req.user;

        if (!companyId) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Company ID missing.' });
        }

        // 1. Get all admins for this company
        const admins = await Admin.find({ companyId }).select('_id fullName');

        // 2. Get all managers from users for this company
        // const managers = await User.find({ companyId, position: 'Manager' }).select('_id firstName lastName');

        // 3. Format both results
        const formattedAdmins = admins.map(admin => ({
            id: admin._id,
            name: admin.fullName,
            role: 'admin',
        }));

        // const formattedManagers = managers.map(manager => ({
        //     id: manager._id,
        //     name: `${manager.firstName} ${manager.lastName}`,
        //     role: 'manager',
        // }));

        // 4. Merge and send
        // const approvers = [...formattedAdmins, ...formattedManagers];
        const approvers = [...formattedAdmins];
        res.status(200).json({ success: true, data: approvers });
    } catch (error) {
        console.error('Error fetching approvers:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
// Store Timesheet Controller
const storeTimesheet = async (
  req,
  res
) => {
  try {
    const {
      date,
      projectName,
      items = [],
      notifiedManagers = [],
    } = req.body;
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    // Calculate total work hours from tasks
    const totalWorkHours = items.reduce(
      (sum, task) => {
        const [hours, minutes] =
          task.duration
            .split(":")
            .map(Number);
        return (
          sum + (hours * 60 + minutes)
        );
      },
      0
    );

    // Convert total work hours back to HH:MM format
    const totalHours = `${String(
      Math.floor(totalWorkHours / 60)
    ).padStart(2, "0")}:${String(
      totalWorkHours % 60
    ).padStart(2, "0")}`;

    // Ensure total work hours are at least 8 hours
    if (totalWorkHours < 480) {
      return res.status(400).json({
        message:
          "Total work hours must be at least 8 hours.",
      });
    }

    // Create and save the timesheet
    const timesheet = new Timesheet({
      userId,
      companyId,
      date,
      projectName,
      items,
      notifiedManagers,
      totalWorkHours: totalHours,
    });

    await timesheet.save();

    return res.status(201).json({
      message:
        "Timesheet submitted successfully.",
      timesheet,
    });
  } catch (error) {
    console.error(
      "Error saving timesheet:",
      error
    );
    return res.status(500).json({
      message:
        "Server error while saving timesheet.",
    });
  }
}; // Import Moment.js to format dates

const getTimesheetsbyDate = async (
  req,
  res
) => {
  const { date } = req.params; // Date passed as a string
  const userId = req.user?.userId;
  const companyId = req.user.companyId;

  if (!userId) {
    return res.status(400).json({
      message: "User not authenticated",
    });
  }

  // Convert the date to the expected format if it's a Date object or a string
  const formattedDate = moment(
    date,
    "YYYY-MM-DD",
    true
  ).isValid()
    ? moment(date).format("YYYY-MM-DD") // Ensure it matches YYYY-MM-DD format
    : null;

  if (!formattedDate) {
    return res.status(400).json({
      message:
        "Invalid date format. Expected YYYY-MM-DD.",
    });
  }

  console.log(
    `Fetching timesheet for User ID: ${userId}, Date: ${formattedDate}`
  );

  try {
    // Fetch the timesheet based on userId and formatted date
    const timesheet =
      await Timesheet.findOne({
        userId,
        companyId,
        date: formattedDate,
      });

    if (timesheet) {
      return res.status(200).json({
        message: "Timesheet found",
        boolean: true,
        timesheet,
      });
    } else {
      return res.status(200).json({
        message: "No timesheet found for this date",
        boolean: false,
        timesheet: null,
      });
    }
  } catch (err) {
    console.error(
      "Error fetching timesheet:",
      err
    );
    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// Update Timesheet Controller
const updateTimesheet = async (
  req,
  res
) => {
  try {
    const { date } = req.params;
    const {
      projectName,
      items = [],
      notifiedManagers = [],
    } = req.body;
    const userId = req.user.userId;
    const companyId = req.user.companyId;

    // Validate date format
    const formattedDate = moment(
      date,
      "YYYY-MM-DD",
      true
    ).isValid()
      ? moment(date).format(
          "YYYY-MM-DD"
        )
      : null;

    if (!formattedDate) {
      return res.status(400).json({
        message:
          "Invalid date format. Use YYYY-MM-DD.",
      });
    }

    // Calculate total work hours
    const totalMinutes = items.reduce(
      (sum, task) => {
        const [hours, minutes] =
          task.duration
            .split(":")
            .map(Number);
        return (
          sum + (hours * 60 + minutes)
        );
      },
      0
    );

    const totalHours = `${String(
      Math.floor(totalMinutes / 60)
    ).padStart(2, "0")}:${String(
      totalMinutes % 60
    ).padStart(2, "0")}`;

    if (totalMinutes < 480) {
      return res.status(400).json({
        message:
          "Total work hours must be at least 8 hours.",
      });
    }

    // Find and update the existing timesheet
    const updated =
      await Timesheet.findOneAndUpdate(
        { userId,companyId, date: formattedDate },
        {
          projectName,
          items,
          notifiedManagers,
          totalWorkHours: totalHours,
        },
        { new: true }
      );

    if (!updated) {
      return res.status(200).json({
        message:
          "Timesheet not found for this date.",
      });
    }

    return res.status(200).json({
      message:
        "Timesheet updated successfully",
      timesheet: updated,
    });
  } catch (error) {
    console.error(
      "Error updating timesheet:",
      error
    );
    return res.status(500).json({
      message:
        "Server error while updating timesheet.",
    });
  }
};

const getUserTimesheetsByCompany = async (req, res) => {
  const { companyId } = req.user;

  try {
    const timesheets = await Timesheet.find({ companyId })
      .populate("userId", "firstName lastName email position") // Pick fields to show
      .exec();

    if (!timesheets || timesheets.length === 0) {
      return res.status(200).json({ success: false, message: "No timesheets found." });
    }

    res.status(200).json({
      success: true,
      count: timesheets.length,
      data: timesheets,
    });
  } catch (error) {
    console.error("Error fetching timesheets:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export {
  storeTimesheet,
  getTimesheetsbyDate,
  updateTimesheet,
  getUserTimesheetsByCompany,
  getApprovers
};
