import Attendance from "../models/attendance.model.js";
import Timesheet from "../models/timesheet.model.js";
import User from "../models/user.model.js";
import Leave from "../models/leave.model.js";
import PerformanceScore from "../models/performance.model.js";
import getWeekRange from "../utils/weekRange.utils.js";
import mongoose from "mongoose";

export const generateWeeklyScore = async (req, res) => {
  try {
    const { companyId } = req.user;
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    // Get week range from query params or use current week
    let weekStart, weekEnd;
    if (req.query.weekStart) {
      weekStart = new Date(req.query.weekStart);
      // Ensure it's Monday and set time to start of day
      weekStart.setHours(0, 0, 0, 0);

      weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 5); // Saturday (6 days from Monday)
      weekEnd.setHours(23, 59, 59, 999);
    } else {
      const weekRange = getWeekRange();
      weekStart = weekRange.weekStart;
      weekEnd = weekRange.weekEnd;
    }

    // First, try to find existing performance data for this week
    const existingPerformanceData = await PerformanceScore.find({
      companyId,
      weekStart,
      weekEnd,
    }).populate("userId", "firstName lastName");

    if (existingPerformanceData && existingPerformanceData.length > 0) {
      // Return existing data with proper structure
      const formattedData = existingPerformanceData.map((perf) => ({
        _id: perf._id,
        userId: perf.userId._id,
        name: `${perf.userId.firstName} ${perf.userId.lastName}`,
        timesheetScore: perf.score[0]?.timesheetScore || 0,
        attendanceScore: perf.score[0]?.attendanceScore || 0,
        behaviourScore: perf.score[0]?.behaviourScore || 0,
        totalScore: perf.score[0]?.totalScore || 0,
        remark: perf.remark || "", // Include remark from performance record
      }));

      return res.status(200).json(formattedData);
    }

    // If no existing data, generate new scores
    const users = await User.find({ companyId });

    if (!users || users.length === 0) {
      return res
        .status(404)
        .json({ message: "No users found for this company" });
    }

    const allScores = [];

    for (const user of users) {
      const userId = user._id;

      const attendances = await Attendance.find({
        userId,
        companyId,
        date: { $gte: weekStart, $lte: weekEnd },
      });

      const timesheets = await Timesheet.find({
        userId,
        companyId,
        date: { $gte: weekStart, $lte: weekEnd },
      });

      const leaves = await Leave.find({
        userId,
        companyId,
        fromDate: { $lte: weekEnd },
        toDate: { $gte: weekStart },
        status: "Approved",
      });

      let expectedWorkingDays = 0;
      let actualAttendanceDays = 0;
      let actualTimesheetDays = 0;

      for (let i = 0; i < 6; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);

        const isLeave = leaves.some(
          (l) => date >= l.fromDate && date <= l.toDate,
        );

        if (!isLeave) {
          expectedWorkingDays++;

          const attendanceForDay = attendances.find(
            (a) =>
              new Date(a.date).toDateString() === date.toDateString() &&
              a.status !== "Absent",
          );
          if (attendanceForDay) actualAttendanceDays++;

          const hasTimesheet = timesheets.some(
            (t) => new Date(t.date).toDateString() === date.toDateString(),
          );
          if (hasTimesheet) actualTimesheetDays++;
        }
      }

      // Calculate scores
      const attendanceScore =
        expectedWorkingDays > 0
          ? Math.round((actualAttendanceDays / expectedWorkingDays) * 4 * 100) /
            100
          : 0;
      const timesheetScore =
        expectedWorkingDays > 0
          ? Math.round((actualTimesheetDays / expectedWorkingDays) * 3 * 100) /
            100
          : 0;

      // Check for existing performance record for this specific week
      let performanceScore = await PerformanceScore.findOne({
        userId,
        companyId,
        weekStart,
        weekEnd,
      });

      // Preserve existing behavior score if available
      let existingBehaviourScore = 0;
      let existingRemark = "";
      if (performanceScore && performanceScore.score.length > 0) {
        existingBehaviourScore = performanceScore.score[0].behaviourScore || 0;
        existingRemark = performanceScore.remark || "";
      }

      // Create score entry with preserved behavior score
      const scoreEntry = {
        timesheetScore,
        attendanceScore,
        behaviourScore: existingBehaviourScore,
        totalScore:
          Math.round(
            (timesheetScore + attendanceScore + existingBehaviourScore) * 100,
          ) / 100,
      };

      // Update or create new performance score
      if (performanceScore) {
        performanceScore.score = [scoreEntry];
      } else {
        performanceScore = new PerformanceScore({
          userId,
          companyId,
          weekStart,
          weekEnd,
          score: [scoreEntry],
          remark: existingRemark,
        });
      }

      await performanceScore.save();

      allScores.push({
        _id: performanceScore._id,
        userId: user._id,
        name: `${user.firstName} ${user.lastName}`,
        ...scoreEntry,
        remark: existingRemark, // Include remark in response
      });
    }

    // If we generated new scores but they're all empty, return appropriate message
    if (allScores.length === 0) {
      return res.status(404).json({
        message: "No performance data found for the specified week range",
      });
    }

    return res.status(200).json(allScores);
  } catch (err) {
    console.error("Error in generateWeeklyScore:", err);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

export const updateBehaviourScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { behaviourScore, remark } = req.body;

    if (!id || (behaviourScore === undefined && remark === undefined)) {
      return res.status(400).json({
        message:
          "ID and at least one field (behaviourScore or remark) are required",
      });
    }

    const performance = await PerformanceScore.findById(id);

    if (!performance) {
      return res.status(404).json({ message: "Performance record not found" });
    }

    // Update the score and remark
    const score = performance.score[0];

    if (behaviourScore !== undefined) {
      // Validate behaviour score range (updated to 0-3 as per frontend)
      if (behaviourScore < 0 || behaviourScore > 3) {
        return res
          .status(400)
          .json({ message: "Behaviour score must be between 0 and 3" });
      }
      score.behaviourScore = behaviourScore;
    }

    if (remark !== undefined) {
      performance.remark = remark.trim();
    }

    // Recalculate total score
    score.totalScore =
      Math.round(
        (score.attendanceScore + score.timesheetScore + score.behaviourScore) *
          100,
      ) / 100;

    await performance.save();

    return res.status(200).json({
      message: "Performance record updated successfully",
      performance,
    });
  } catch (err) {
    console.error("Error in updateBehaviourScore:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const getWeeklyScore = async (req, res) => {
  try {
    const { adminId, companyId } = req.user;
    const { weekStart: weekStartStr } = req.query;

    if (!adminId || !companyId) {
      return res.status(400).json({
        message: "Authenticated userId and companyId are required",
      });
    }

    // Parse weekStart or use current week Monday
    let weekStart, weekEnd;
    if (weekStartStr) {
      weekStart = new Date(weekStartStr);
      weekStart.setHours(0, 0, 0, 0);
      weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 5); // Saturday
      weekEnd.setHours(23, 59, 59, 999);
    } else {
      const weekRange = getWeekRange(); // Assumes this returns { weekStart, weekEnd }
      weekStart = weekRange.weekStart;
      weekEnd = weekRange.weekEnd;
    }

    // Fetch all scores for the user, company, and week range
    const performanceScores = await PerformanceScore.find({
      companyId,
      weekStart,
      weekEnd,
    }).populate("userId", "firstName lastName");

    if (!performanceScores || performanceScores.length === 0) {
      return res.status(404).json({
        message: "No performance scores found for the specified week",
      });
    }

    // Format the response to include remarks
    const formattedScores = performanceScores.map((perf) => ({
      _id: perf._id,
      userId: perf.userId._id,
      name: `${perf.userId.firstName} ${perf.userId.lastName}`,
      score: perf.score[0],
      remark: perf.remark || "",
      weekStart: perf.weekStart,
      weekEnd: perf.weekEnd,
    }));

    return res.status(200).json({ performanceScores: formattedScores });
  } catch (err) {
    console.error("Error fetching weekly scores:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const getAllWeeklyScores = async (req, res) => {
  try {
    const { companyId } = req.user;

    const weeklyScore = await PerformanceScore.find({
      companyId,
    }).populate("userId", "firstName lastName");

    if (!weeklyScore || weeklyScore.length === 0) {
      return res.status(404).json({
        message: "No weekly score found",
      });
    }

    // Format the response to include remarks
    const formattedScores = weeklyScore.map((perf) => ({
      _id: perf._id,
      userId: perf.userId._id,
      name: `${perf.userId.firstName} ${perf.userId.lastName}`,
      score: perf.score[0],
      remark: perf.remark || "",
      weekStart: perf.weekStart,
      weekEnd: perf.weekEnd,
    }));

    res.status(200).json(formattedScores);
  } catch (error) {
    console.error("Error in fetching all weekly score", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getIndividualWeeklyScore = async (req, res) => {
  try {
    const { userId, companyId } = req.user;
    const { weekStart: weekStartStr } = req.query;

    if (!userId || !companyId)
      return res
        .status(400)
        .json({ message: "Authenticated userId and companyId are required" });

    let weekStart, weekEnd;
    if (weekStartStr) {
      weekStart = new Date(weekStartStr);
      weekStart.setHours(0, 0, 0, 0);
      weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 5); // Saturday
      weekEnd.setHours(23, 59, 59, 999);
    } else {
      const weekRange = getWeekRange(); // Assumes this returns { weekStart, weekEnd }
      weekStart = weekRange.weekStart;
      weekEnd = weekRange.weekEnd;
    }

    const performanceScore = await PerformanceScore.findOne({
      userId,
      companyId,
      weekStart,
      weekEnd,
    }).populate("userId", "firstName");

    if (!performanceScore)
      return res.status(404).json({ message: "Not found" });

    res.status(200).json(performanceScore);
  } catch (error) {
    console.error("Error in fetching individual weekly score:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getIndividualMonthlyScore = async (req, res) => {
  try {
    const { userId, companyId } = req.user;
    const { month, year } = req.query;

    if (!userId || !companyId)
      return res
        .status(400)
        .json({ message: "Authenticated userId and companyId are required" });

    // Default to current month and year if not provided
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    // Get the first day of the month
    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    monthStart.setHours(0, 0, 0, 0);

    // Get the last day of the month
    const monthEnd = new Date(targetYear, targetMonth, 0);
    monthEnd.setHours(23, 59, 59, 999);

    // Aggregate weekly scores for the month
    const monthlyScores = await PerformanceScore.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          companyId: new mongoose.Types.ObjectId(companyId),
          weekStart: { $gte: monthStart },
          weekEnd: { $lte: monthEnd },
        },
      },
      {
        $sort: { weekStart: 1 },
      },
      {
        $group: {
          _id: {
            $week: "$weekStart",
          },
          week: { $first: { $week: "$weekStart" } },
          weekStart: { $first: "$weekStart" },
          avgTimesheetScore: {
            $avg: { $arrayElemAt: ["$score.timesheetScore", 0] },
          },
          avgAttendanceScore: {
            $avg: { $arrayElemAt: ["$score.attendanceScore", 0] },
          },
          avgBehaviourScore: {
            $avg: { $arrayElemAt: ["$score.behaviourScore", 0] },
          },
          avgTotalScore: {
            $avg: { $arrayElemAt: ["$score.totalScore", 0] },
          },
          remark: { $first: "$remark" },
        },
      },
      {
        $project: {
          _id: 0,
          week: { $subtract: ["$week", { $week: monthStart }] },
          weekStart: 1,
          avgTimesheetScore: { $round: ["$avgTimesheetScore", 1] },
          avgAttendanceScore: { $round: ["$avgAttendanceScore", 1] },
          avgBehaviourScore: { $round: ["$avgBehaviourScore", 1] },
          avgTotalScore: { $round: ["$avgTotalScore", 1] },
          remark: 1,
        },
      },
      {
        $sort: { weekStart: 1 },
      },
    ]);

    if (!monthlyScores || monthlyScores.length === 0) {
      return res.status(404).json({
        message: "No performance data found for this month",
        data: [],
      });
    }

    // Generate overall monthly remark
    const overallAvgScore =
      monthlyScores.reduce((sum, week) => sum + week.avgTotalScore, 0) /
      monthlyScores.length;
    let monthlyRemark = "";

    if (overallAvgScore >= 9) {
      monthlyRemark =
        "Outstanding monthly performance! Consistently excellent across all areas.";
    } else if (overallAvgScore >= 8) {
      monthlyRemark =
        "Very good monthly performance with room for minor improvements.";
    } else if (overallAvgScore >= 7) {
      monthlyRemark =
        "Good monthly performance. Focus on consistency across all metrics.";
    } else {
      monthlyRemark =
        "Monthly performance needs significant improvement. Consider discussing with your manager.";
    }

    res.status(200).json({
      period: `${targetMonth}/${targetYear}`,
      overallAvgScore: Math.round(overallAvgScore * 10) / 10,
      remark: monthlyRemark,
      data: monthlyScores,
    });
  } catch (error) {
    console.error("Error in fetching individual monthly score:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getIndividualYearlyScore = async (req, res) => {
  try {
    const { userId, companyId } = req.user;
    const { year } = req.query;

    if (!userId || !companyId)
      return res
        .status(400)
        .json({ message: "Authenticated userId and companyId are required" });

    // Default to current year if not provided
    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    // Get the first day of the year
    const yearStart = new Date(targetYear, 0, 1);
    yearStart.setHours(0, 0, 0, 0);

    // Get the last day of the year
    const yearEnd = new Date(targetYear, 11, 31);
    yearEnd.setHours(23, 59, 59, 999);

    // Aggregate monthly scores for the year
    const yearlyScores = await PerformanceScore.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          companyId: new mongoose.Types.ObjectId(companyId),
          weekStart: { $gte: yearStart },
          weekEnd: { $lte: yearEnd },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$weekStart" },
            year: { $year: "$weekStart" },
          },
          monthNumber: { $first: { $month: "$weekStart" } },
          avgTimesheetScore: {
            $avg: { $arrayElemAt: ["$score.timesheetScore", 0] },
          },
          avgAttendanceScore: {
            $avg: { $arrayElemAt: ["$score.attendanceScore", 0] },
          },
          avgBehaviourScore: {
            $avg: { $arrayElemAt: ["$score.behaviourScore", 0] },
          },
          avgTotalScore: {
            $avg: { $arrayElemAt: ["$score.totalScore", 0] },
          },
          weekCount: { $sum: 1 },
          // Collect all remarks for the month
          remarks: { $push: "$remark" },
        },
      },
      {
        $project: {
          _id: 0,
          monthNumber: 1,
          month: {
            $switch: {
              branches: [
                { case: { $eq: ["$monthNumber", 1] }, then: "January" },
                { case: { $eq: ["$monthNumber", 2] }, then: "February" },
                { case: { $eq: ["$monthNumber", 3] }, then: "March" },
                { case: { $eq: ["$monthNumber", 4] }, then: "April" },
                { case: { $eq: ["$monthNumber", 5] }, then: "May" },
                { case: { $eq: ["$monthNumber", 6] }, then: "June" },
                { case: { $eq: ["$monthNumber", 7] }, then: "July" },
                { case: { $eq: ["$monthNumber", 8] }, then: "August" },
                { case: { $eq: ["$monthNumber", 9] }, then: "September" },
                { case: { $eq: ["$monthNumber", 10] }, then: "October" },
                { case: { $eq: ["$monthNumber", 11] }, then: "November" },
                { case: { $eq: ["$monthNumber", 12] }, then: "December" },
              ],
              default: "Unknown",
            },
          },
          avgTimesheetScore: { $round: ["$avgTimesheetScore", 1] },
          avgAttendanceScore: { $round: ["$avgAttendanceScore", 1] },
          avgBehaviourScore: { $round: ["$avgBehaviourScore", 1] },
          avgTotalScore: { $round: ["$avgTotalScore", 1] },
          weekCount: 1,
          // Create a combined remark from all weekly remarks
          remark: {
            $reduce: {
              input: {
                $filter: {
                  input: "$remarks",
                  cond: {
                    $and: [{ $ne: ["$$this", ""] }, { $ne: ["$$this", null] }],
                  },
                },
              },
              initialValue: "",
              in: {
                $cond: {
                  if: { $eq: ["$$value", ""] },
                  then: "$$this",
                  else: { $concat: ["$$value", "; ", "$$this"] },
                },
              },
            },
          },
        },
      },
      {
        $sort: { monthNumber: 1 },
      },
    ]);

    if (!yearlyScores || yearlyScores.length === 0) {
      return res.status(404).json({
        message: "No performance data found for this year",
        data: [],
      });
    }

    // Generate overall yearly remark
    const overallAvgScore =
      yearlyScores.reduce((sum, month) => sum + month.avgTotalScore, 0) /
      yearlyScores.length;
    let yearlyRemark = "";

    if (overallAvgScore >= 9) {
      yearlyRemark =
        "Exceptional yearly performance! You've maintained excellence throughout the year.";
    } else if (overallAvgScore >= 8) {
      yearlyRemark =
        "Strong yearly performance with consistent results across most months.";
    } else if (overallAvgScore >= 7) {
      yearlyRemark =
        "Good yearly performance. Consider focusing on consistency for the upcoming year.";
    } else {
      yearlyRemark =
        "Yearly performance shows room for substantial improvement. Consider setting specific goals for next year.";
    }

    // Calculate trends
    const firstHalfAvg =
      yearlyScores
        .slice(0, 6)
        .reduce((sum, month) => sum + month.avgTotalScore, 0) /
      Math.min(6, yearlyScores.length);
    const secondHalfAvg =
      yearlyScores
        .slice(6)
        .reduce((sum, month) => sum + month.avgTotalScore, 0) /
      Math.max(1, yearlyScores.length - 6);
    const isImproving = secondHalfAvg > firstHalfAvg;

    res.status(200).json({
      year: targetYear,
      overallAvgScore: Math.round(overallAvgScore * 10) / 10,
      remark: yearlyRemark,
      isImproving: isImproving,
      trend: isImproving ? "Improving" : "Declining",
      data: yearlyScores,
    });
  } catch (error) {
    console.error("Error in fetching individual yearly score:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
