import Attendance from '../models/attendance.model.js';

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
    const userId = req.user.userId;
    const today = getStartOfDayUTC();

    // Check for existing attendance record
    let attendance = await Attendance.findOne({
      userId: userId,
      date: today,
    });

    if (attendance && attendance.punchIn) {
      return res.status(400).json({
        message: 'Already punched in for today.',
      });
    }

    if (!attendance) {
      attendance = new Attendance({
        userId,
        date: today,
      });
    }

    // Set punch in time (either provided or current time)
    const now = new Date();
    attendance.punchIn = punchInTime ? new Date(punchInTime) : now;
    attendance.punchInLocation = punchInLocation || null;

    // Determine remark based on punch-in time (consider 9:30 AM as late)
    const punchInHour = attendance.punchIn.getUTCHours();
    const punchInMinute = attendance.punchIn.getUTCMinutes();

    if (punchInHour < 9 || (punchInHour === 9 && punchInMinute <= 30)) {
      attendance.remark = 'Present';
    } else {
      attendance.remark = 'Late';
    }

    attendance.status = 'Pending'; // initially pending until punch out

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
    const userId = req.user.userId;
    const today = getStartOfDayUTC();

    const attendance = await Attendance.findOne({
      userId: userId,
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
    const userId = req.user.userId;
    const today = getStartOfDayUTC();

    const attendance = await Attendance.findOne({
      userId: userId,
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
    const userId = req.user.userId;
    const attendance = await Attendance.find({ userId }).sort({ date: -1 }); // Sort by date descending

    if (!attendance || attendance.length === 0) {
      return res.status(404).json({
        message: 'No attendance records found',
      });
    }

    res.status(200).json(attendance);
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
    const attendance = await Attendance.aggregate([
      {
        $addFields: {
          userObjectId: { $toObjectId: '$userId' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userObjectId',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $unwind: {
          path: '$userInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          firstName: '$userInfo.firstName',
          lastName: '$userInfo.lastName',
          email: '$userInfo.email',
          punchIn: 1,
          punchOut: 1,
          userId: 1,
          date: 1,
          remark: 1,
          status: 1,
          totalWorkedHours: 1,
          overtime: 1,
        },
      },
      { $sort: { date: -1 } }, // Sort by date descending
    ]);

    if (!attendance || attendance.length === 0) {
      return res.status(404).json({ message: 'No attendance records found' });
    }

    res.status(200).json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      message: 'Server error fetching attendance',
      error: error.message,
    });
  }
};
