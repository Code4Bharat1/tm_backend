import Attendance from '../models/attendance.model.js';
import User from '../models/user.model.js';
// Utility function to calculate duration in hours
const calculateHours = (start, end) => {
  const ms = new Date(end) - new Date(start);
  return ms / (1000 * 60 * 60); // convert milliseconds to hours
};

export const punchOutController = async (req, res) => {
  try {
    const { punchOutTime, punchOutLocation, emergencyReason } = req.body;
    const userId = req.user.userId;
    const today = new Date().setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      userId: userId,
      date: today,
    });

    if (!attendance) {
      return res.status(404).json({
        message: 'Punch-in record not found',
      });
    }

    if (!attendance.punchIn) {
      attendance.status = 'Pending';
      await attendance.save();
      return res.status(200).json({
        message: 'Punch-in missing. Status set to Pending.',
        attendance,
      });
    }

    attendance.punchOut = punchOutTime ? new Date(punchOutTime) : new Date();
    attendance.punchOutLocation = punchOutLocation || null;

    const totalHours = calculateHours(attendance.punchIn, attendance.punchOut);
    attendance.totalWorkedHours = totalHours;

    if (totalHours < 4.5) {
      attendance.status = 'Emergency';
      attendance.emergencyReason = emergencyReason || 'Not provided';
    } else if (totalHours < 8) {
      attendance.status = 'Half-Day';
    } else {
      attendance.status = 'Present';
      if (totalHours > 8) {
        // You can also add a separate `overtime` field if needed
        attendance.overtime = totalHours - 8;
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
      error,
    });
  }
};

export const punchInController = async (req, res) => {
  try {
    const { punchInTime, punchInLocation } = req.body;
    const userId = req.user.userId;
    const today = new Date().setHours(0, 0, 0, 0);

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

    attendance.punchIn = punchInTime ? new Date(punchInTime) : new Date();
    attendance.punchInLocation = punchInLocation || null;

    // Determine remark based on punch-in time
    const punchInDate = attendance.punchIn;
    const punchInHour = punchInDate.getHours();
    const punchInMinute = punchInDate.getMinutes();

    if (punchInHour < 9 || (punchInHour === 9 && punchInMinute === 0)) {
      attendance.remark = 'Present';
    } else {
      attendance.remark = 'Late';
    }

    attendance.status = 'Pending'; // initially pending until punch out

    await attendance.save();

    res.status(200).json({
      message: 'Punch-in successful',
      punchInTime: attendance.punchIn,
      attendance,
    });
  } catch (error) {
    console.error('Punch-in error:', error);
    res.status(500).json({
      message: 'Server error during punch-in',
      error,
    });
  }
};

export const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date().setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      userId: userId,
      date: today,
    });

    if (!attendance) {
      return res.status(200).json({
        punchedIn: false,
        punchedOut: false,
      });
    }

    res.status(200).json({
      punchedIn: !!attendance.punchIn,
      punchInTime: attendance.punchIn || null,
      punchInLocation: attendance.punchInLocation || null,
      punchedOut: !!attendance.punchOut,
      punchOutTime: attendance.punchOut || null,
      punchOutLocation: attendance.punchOutLocation || null,
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      message: 'Server error fetching attendance',
      error,
    });
  }
};

export const getParticularUserAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const attendance = await Attendance.find({ userId });
    if (!attendance) {
      return res.status(404).json({
        message: 'No attendance records found',
      });
    }
    res.status(200).json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      message: 'Server error fetching attendance',
      error,
    });
  }
};

import mongoose from 'mongoose';

export const getAllAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.aggregate([
      {
        $addFields: {
          userObjectId: { $toObjectId: '$userId' }, // 👈 Convert userId (string) to ObjectId
        },
      },
      {
        $lookup: {
          from: 'users', // your actual MongoDB collection name
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
          punchIn: 1,
          punchOut: 1,
          userId: 1,
          date: 1,
          remark: 1,
        },
      },
    ]);

    if (!attendance || attendance.length === 0) {
      return res.status(404).json({ message: 'No attendance records found' });
    }

    res.status(200).json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      message: 'Server error fetching attendance',
      error,
    });
  }
};
