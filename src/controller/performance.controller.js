import Attendance from "../models/attendance.model.js";
import Timesheet from "../models/timesheet.model.js";
import User from "../models/user.model.js";
import Leave from "../models/leave.model.js";
import PerformanceScore from "../models/performance.model.js";
import getWeekRange from "../utils/weekRange.utils.js";

// export const generateWeeklyScore = async (req, res) => {
//   try {
//     const { companyId } = req.user;
//     if (!companyId) {
//       return res.status(400).json({ message: "companyId is required" });
//     }

//     const { weekStart, weekEnd } = getWeekRange();

//     const users = await User.find({ companyId });

//     const allScores = [];

//     for (const user of users) {
//       const userId = user._id;

//       const attendances = await Attendance.find({
//         userId,
//         companyId,
//         date: { $gte: weekStart, $lte: weekEnd },
//       });

//       const timesheets = await Timesheet.find({
//         userId,
//         companyId,
//         date: { $gte: weekStart, $lte: weekEnd },
//       });

//       const leaves = await Leave.find({
//         userId,
//         companyId,
//         fromDate: { $lte: weekEnd },
//         toDate: { $gte: weekStart },
//         status: "Approved",
//       });

//       let expectedWorkingDays = 0;
//       let actualAttendanceDays = 0;
//       let actualTimesheetDays = 0;

//       for (let i = 0; i < 6; i++) {
//         const date = new Date(weekStart);
//         date.setDate(date.getDate() + i);

//         const isLeave = leaves.some(
//           (l) => date >= l.fromDate && date <= l.toDate,
//         );

//         if (!isLeave) {
//           expectedWorkingDays++;

//           const attendanceForDay = attendances.find(
//             (a) =>
//               new Date(a.date).toDateString() === date.toDateString() &&
//               a.status !== "Absent",
//           );
//           if (attendanceForDay) actualAttendanceDays++;

//           const hasTimesheet = timesheets.some(
//             (t) => new Date(t.date).toDateString() === date.toDateString(),
//           );
//           if (hasTimesheet) actualTimesheetDays++;
//         }
//       }

//       const attendanceScore =
//         expectedWorkingDays > 0
//           ? Math.round((actualAttendanceDays / expectedWorkingDays) * 4 * 100) /
//             100
//           : 0;
//       const timesheetScore =
//         expectedWorkingDays > 0
//           ? Math.round((actualTimesheetDays / expectedWorkingDays) * 4 * 100) /
//             100
//           : 0;

//       const behaviourScore = 0;
//       const totalScore =
//         Math.round((timesheetScore + attendanceScore + behaviourScore) * 100) /
//         100;

//       const scoreEntry = {
//         timesheetScore,
//         attendanceScore,
//         behaviourScore,
//         totalScore,
//       };

//       let performanceScore = await PerformanceScore.findOne({
//         userId,
//         companyId,
//         weekStart,
//         weekEnd,
//       });

//       if (performanceScore) {
//         performanceScore.score = [scoreEntry];
//       } else {
//         performanceScore = new PerformanceScore({
//           userId,
//           companyId,
//           weekStart,
//           weekEnd,
//           score: [scoreEntry],
//         });
//       }

//       await performanceScore.save();

//       allScores.push({
//         _id: performanceScore._id,
//         userId: user._id,
//         name: `${user.firstName} ${user.lastName}`,
//         ...scoreEntry,
//       });
//     }

//     return res.status(200).json(allScores);
//   } catch (err) {
//     console.error(err);
//     return res
//       .status(500)
//       .json({ message: "Internal Server Error", error: err.message });
//   }
// };
export const generateWeeklyScore = async (req, res) => {
  try {
    const { companyId } = req.user;
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const { weekStart, weekEnd } = getWeekRange();

    const users = await User.find({ companyId });

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

      // Check for existing performance record
      let performanceScore = await PerformanceScore.findOne({
        userId,
        companyId,
        weekStart,
        weekEnd,
      });

      // Preserve existing behavior score if available
      let existingBehaviourScore = 0;
      if (performanceScore && performanceScore.score.length > 0) {
        existingBehaviourScore = performanceScore.score[0].behaviourScore;
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
        });
      }

      await performanceScore.save();

      allScores.push({
        _id: performanceScore._id,
        userId: user._id,
        name: `${user.firstName} ${user.lastName}`,
        ...scoreEntry,
      });
    }

    return res.status(200).json(allScores);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};
export const updateBehaviourScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { behaviourScore } = req.body;
    if (!id || behaviourScore === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const performance = await PerformanceScore.findById(id);

    if (!performance) {
      return res.status(404).json({ message: "Performance record not found" });
    }

    const score = performance.score[0];
    score.behaviourScore = behaviourScore;
    score.totalScore =
      Math.round(
        (score.attendanceScore + score.timesheetScore + behaviourScore) * 100,
      ) / 100;

    await performance.save();

    return res
      .status(200)
      .json({ message: "Behaviour score updated", performance });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

export const getWeeklyScore = async (req, res) => {
  try {
    const { userId, companyId, weekStart: weekStartStr } = req.query;

    if (!userId || !companyId) {
      return res.status(400).json({
        message: "userId and companyId are required",
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
      const weekRange = getWeekRange();
      weekStart = weekRange.weekStart;
      weekEnd = weekRange.weekEnd;
    }

    const performanceScore = await PerformanceScore.findOne({
      userId,
      companyId,
      weekStart,
      weekEnd,
    });

    if (!performanceScore) {
      return res.status(404).json({
        message: "Performance score not found for the specified week",
      });
    }

    return res.status(200).json({ performanceScore });
  } catch (err) {
    console.error("Error fetching weekly score:", err);
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
    }).populate("userId", "firstName");

    if (!weeklyScore)
      return res.status(404).json({
        message: "No weekly score found",
      });

    res.status(200).json(weeklyScore);
  } catch (error) {
    console.error("Error in fetching all weekly score", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
