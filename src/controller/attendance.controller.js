import Attendance from '../models/attendance.model.js';
import mongoose from 'mongoose';
// Utility function to calculate duration in hours
const calculateHours = (start, end) => {
  const ms = new Date(end) - new Date(start);
  return (ms / (1000 * 60 * 60)).toFixed(2); // convert to hours with 2 decimal places
};

// Utility to get start of day in UTC
const getStartOfDayUTC = () => {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
};

export const punchInController = async (req, res) => {
  try {
    const { punchInTime, punchInLocation } = req.body;
    const { userId, companyId } = req.user;

    // Get start of today (midnight) in UTC
    const todayStart = getStartOfDayUTC();

    // Get todayEnd = 11:59:59.999 PM (end of the day)
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCHours(23, 59, 59, 999);

    // Get start of tomorrow (midnight next day)
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

    // Determine punch-in datetime (provided or now)
    const now = new Date();
    const punchInDateTime = punchInTime ? new Date(punchInTime) : now;

    // Check if punch-in is after or equal to 11:59 PM today but before tomorrow midnight
    if (punchInDateTime >= todayEnd && punchInDateTime < tomorrowStart) {
      // Mark absent for today
      let attendance = await Attendance.findOne({
        userId,
        companyId,
        date: todayStart,
      });

      if (!attendance) {
        attendance = new Attendance({
          userId,
          companyId,
          date: todayStart,
        });
      }

      attendance.status = 'Absent';
      attendance.remark = 'Absent due to late punch-in (after 11:59 PM)';
      await attendance.save();

      return res.status(400).json({
        message: 'Cannot punch in after 11:59 PM. Marked absent for today.',
        attendance,
      });
    }

    // Normal punch-in window check (optional: punch-in before start of today disallowed)
    if (punchInDateTime < todayStart) {
      return res.status(400).json({
        message: 'Invalid punch-in time: before start of today.',
      });
    }

    // Find existing attendance record for today
    let attendance = await Attendance.findOne({
      userId,
      companyId,
      date: todayStart,
    });

    if (attendance && attendance.punchIn) {
      return res.status(400).json({
        message: 'Already punched in for today.',
      });
    }

    if (!attendance) {
      attendance = new Attendance({
        userId,
        companyId,
        date: todayStart,
      });
    }

    // Set punch in time and location
    attendance.punchIn = punchInDateTime;
    attendance.punchInLocation = punchInLocation || null;

    // Determine remark based on punch-in time (9:30 AM cutoff)
    const punchInHour = punchInDateTime.getUTCHours();
    const punchInMinute = punchInDateTime.getUTCMinutes();

    if (punchInHour < 9 || (punchInHour === 9 && punchInMinute <= 30)) {
      attendance.remark = 'Present';
    } else {
      attendance.remark = 'Late';
    }

    attendance.status = 'Pending'; // until punch out

    await attendance.save();

    res.status(200).json({
      message: 'Punch-in successful',
      punchInTime: attendance.punchIn,
      remark: attendance.remark,
      attendance,
    });
  } catch (error) {
    console.error('Punch-in error:', error);
    res.status(500).json({
      message: 'Server error during punch-in',
      error: error.message,
    });
  }
};


export const punchOutController = async (req, res) => {
  try {
    const { punchOutTime, punchOutLocation, emergencyReason } = req.body;
    const {userId, companyId} = req.user;
    const today = getStartOfDayUTC();

    const attendance = await Attendance.findOne({
      userId: userId,
      companyId: companyId,
      date: today,
    });

    if (!attendance) {
      return res.status(404).json({
        message: 'No attendance record found for today',
      });
    }

    if (!attendance.punchIn) {
      attendance.status = 'Absent';
      await attendance.save();
      return res.status(400).json({
        message: 'Cannot punch out without punching in first',
        attendance,
      });
    }

    if (attendance.punchOut) {
      return res.status(400).json({
        message: 'Already punched out for today',
      });
    }

    // Set punch out time (either provided or current time)
    const now = new Date();
    attendance.punchOut = punchOutTime ? new Date(punchOutTime) : now;
    attendance.punchOutLocation = punchOutLocation || null;

    // Calculate worked hours
    const totalHours = calculateHours(attendance.punchIn, attendance.punchOut);
    attendance.totalWorkedHours = parseFloat(totalHours);

    // Determine status based on worked hours
    if (totalHours < 4.5) {
      attendance.status = 'Emergency';
      attendance.emergencyReason = emergencyReason || 'Not provided';
    } else if (totalHours < 8) {
      attendance.status = 'Half-Day';
    } else {
      attendance.status = 'Present';
      if (totalHours > 8) {
        attendance.overtime = parseFloat((totalHours - 8).toFixed(2));
      }
    }

    await attendance.save();

    res.status(200).json({
      message: 'Punch-out successful',
      status: attendance.status,
      totalWorkedHours: attendance.totalWorkedHours,
      overtime: attendance.overtime || 0,
      attendance,
    });
  } catch (error) {
    console.error('Punch-out error:', error);
    res.status(500).json({
      message: 'Server error during punch-out',
      error: error.message,
    });
  }
};

export const getTodayAttendance = async (req, res) => {
  try {
    const {userId, companyId} = req.user;
    const today = getStartOfDayUTC();

    const attendance = await Attendance.findOne({
      userId: userId,
      companyId: companyId,
      date: today,
    });

    if (!attendance) {
      return res.status(200).json({
        punchedIn: false,
        punchedOut: false,
        status: 'Absent',
      });
    }

    res.status(200).json({
      punchedIn: !!attendance.punchIn,
      punchInTime: attendance.punchIn || null,
      punchInLocation: attendance.punchInLocation || null,
      punchedOut: !!attendance.punchOut,
      punchOutTime: attendance.punchOut || null,
      punchOutLocation: attendance.punchOutLocation || null,
      status: attendance.status || 'Pending',
      remark: attendance.remark || null,
      totalWorkedHours: attendance.totalWorkedHours || 0,
      overtime: attendance.overtime || 0,
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      message: 'Server error fetching attendance',
      error: error.message,
    });
  }
};

export const getParticularUserAttendance = async (req, res) => {
  try {
    const {userId, companyId} = req.user;
    const attendance = await Attendance.find({ userId, companyId }).sort({ date: -1 });

    // Return empty array instead of 404 when no records found
    res.status(200).json(attendance || []);
    
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      message: 'Server error fetching attendance',
      error: error.message,
    });
  }
};

export const getAllAttendance = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Missing company ID in cookie" });
    }

    const attendanceRecords = await Attendance.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $project: {
          userId: 1,
          date: 1,
          punchIn: 1,
          punchInLocation: 1,
          punchOut: 1,
          totalWorkedHours: 1,
          overtime: 1,
          status: 1,
          remark: 1,
          "userInfo.firstName": 1,
          "userInfo.lastName": 1,
          "userInfo.email": 1,
          "userInfo.position": 1,
        },
      },
      {
        $sort: { date: -1 }, // Most recent records first
      },
    ]);
    // Return empty array instead of 404 when no records found
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(200).json([]);
    }
    res.status(200).json(attendanceRecords);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    res.status(500).json({
      message: "Server error fetching attendance records",
      error: error.message,
    });
  }
};
