import Attendance from '../models/attendance.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';
import { getStartOfDayUTC, calculateHours } from '../utils/attendance.utils.js';

export const punchInController = async (req, res) => {
  try {
    const { punchInTime, punchInLocation, selfieImage } = req.body;
    const { userId, companyId } = req.user;

    // Validation
    if (!selfieImage) return res.status(400).json({ message: 'Selfie required' });
    if (!/^data:image\/(png|jpeg|jpg);base64,/.test(selfieImage)) {
      return res.status(400).json({ message: 'Invalid image format' });
    }

    // Date setup
    const todayStart = new Date(getStartOfDayUTC());
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCHours(23, 59, 59, 999);

    // Time validation
    const punchInDateTime = punchInTime ? new Date(punchInTime) : new Date();
    if (isNaN(punchInDateTime)) {
      return res.status(400).json({ message: 'Invalid time format' });
    }

    // Late punch-in handling
    if (punchInDateTime >= todayEnd) {
      const attendance = await Attendance.findOneAndUpdate(
        { userId, companyId, date: todayStart },
        {
          status: 'Absent',
          remark: 'Late punch-in attempt',
          punchInPhoto: selfieImage
        },
        { upsert: true, new: true }
      );
      return res.status(400).json({
        message: 'Punch-in after 11:59 PM not allowed',
        attendance
      });
    }

    // Existing attendance check
    let attendance = await Attendance.findOne({ userId, companyId, date: todayStart });
    if (attendance?.punchIn) {
      return res.status(400).json({ message: 'Already punched in' });
    }

    // Create new record
    if (!attendance) {
      attendance = new Attendance({
        userId,
        companyId,
        date: todayStart
      });
    }

    // Set punch-in details
    attendance.punchIn = punchInDateTime;
    attendance.punchInLocation = punchInLocation || 'Unknown';
    attendance.punchInPhoto = selfieImage;
    
    // Determine status
    const punchInUTCHours = punchInDateTime.getUTCHours();
    const punchInUTCMinutes = punchInDateTime.getUTCMinutes();
    attendance.remark = (punchInUTCHours < 9 || (punchInUTCHours === 9 && punchInUTCMinutes <= 30)) 
      ? 'Present' 
      : 'Late';

    await attendance.save();

    res.status(200).json({
      message: 'Punch-in successful',
      punchIn: attendance.punchIn,
      photo: attendance.punchInPhoto,
      remark: attendance.remark
    });

  } catch (error) {
    console.error('Punch-in error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

export const punchOutController = async (req, res) => {
  try {
    const { punchOutTime, punchOutLocation, emergencyReason, selfieImage } = req.body;
    const { userId, companyId } = req.user;

    // Validation
    if (!selfieImage) return res.status(400).json({ message: 'Selfie required' });
    if (!/^data:image\/(png|jpeg|jpg);base64,/.test(selfieImage)) {
      return res.status(400).json({ message: 'Invalid image format' });
    }

    // Date setup
    const todayStart = new Date(getStartOfDayUTC());
    let attendance = await Attendance.findOne({ userId, companyId, date: todayStart });

    if (!attendance) {
      return res.status(404).json({ message: 'No attendance record' });
    }

    // Store photo early
    attendance.punchOutPhoto = selfieImage;

    // Validation checks
    if (!attendance.punchIn) {
      attendance.status = 'Absent';
      attendance.remark = 'Punched out without punching in';
      await attendance.save();
      return res.status(400).json({ 
        message: 'No punch-in found',
        attendance 
      });
    }

    if (attendance.punchOut) {
      return res.status(400).json({ message: 'Already punched out' });
    }

    // Set punch-out time
    const punchOutDateTime = punchOutTime ? new Date(punchOutTime) : new Date();
    if (isNaN(punchOutDateTime)) {
      return res.status(400).json({ message: 'Invalid time format' });
    }
    attendance.punchOut = punchOutDateTime;
    attendance.punchOutLocation = punchOutLocation || 'Unknown';

    // Calculate hours
    let totalHours;
    try {
      totalHours = calculateHours(attendance.punchIn, attendance.punchOut);
    } catch (error) {
      console.error('Calculation error:', error);
      return res.status(400).json({ 
        message: 'Invalid time calculation',
        error: error.message 
      });
    }

    attendance.totalWorkedHours = totalHours;

    // Determine status
    if (totalHours < 4.5) {
      attendance.status = 'Emergency';
      attendance.emergencyReason = emergencyReason || 'No reason provided';
    } else if (totalHours < 8) {
      attendance.status = 'Half-Day';
    } else {
      attendance.status = 'Present';
      attendance.overtime = Math.max(0, totalHours - 8);
    }

    await attendance.save();

    res.status(200).json({
      message: 'Punch-out successful',
      punchOut: attendance.punchOut,
      totalHours: attendance.totalWorkedHours,
      overtime: attendance.overtime,
      photo: attendance.punchOutPhoto,
      status: attendance.status
    });

  } catch (error) {
    console.error('Punch-out error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
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

function getStartOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function processAbsentees() {
  try {
    const todayStart = getStartOfTodayUTC();
    const users = await User.find({});

    for (const user of users) {
      const attendance = await Attendance.findOne({
        userId: user._id,
        companyId: user.companyId,
        date: todayStart,
      });

      if (!attendance) {
        await new Attendance({
          userId: user._id,
          companyId: user.companyId,
          date: todayStart,
          status: 'Absent',
          remark: 'Absent',
        }).save();

        console.log(`🚫 Marked Absent: ${user._id} for ${todayStart.toISOString().split('T')[0]}`);
      }
    }

    console.log(`✅ All absentees processed for ${todayStart.toISOString().split('T')[0]}`);
  } catch (error) {
    console.error('❌ Error running absentee cron job:', error.message);
  }
}