import Timesheet from "../models/timesheet.model.js";
import moment from "moment";

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
        date: formattedDate,
      });

    if (timesheet) {
      return res.status(200).json({
        message: "Timesheet found",
        boolean: true,
        timesheet,
      });
    } else {
      return res.status(404).json({
        message:
          "Timesheet not found for this date",
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
        { userId, date: formattedDate },
        {
          projectName,
          items,
          notifiedManagers,
          totalWorkHours: totalHours,
        },
        { new: true }
      );

    if (!updated) {
      return res.status(404).json({
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
export {
  storeTimesheet,
  getTimesheetsbyDate,
  updateTimesheet,
};
