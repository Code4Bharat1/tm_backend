import Attendance from '../models/attendance.model.js';
import User from '../models/user.model.js';
import TaskAssignment from '../models/taskAssignment.model.js';
import mongoose from 'mongoose';
import { getStartOfDayUTC, calculateHours } from '../utils/attendance.utils.js';

// Company office location - White House, Building, Kurla West, Maharashtra
const COMPANY_LOCATION = {

  latitude: 19.0728, // Kurla West coordinates
  longitude: 72.8826,
  allowedRadius: 500 // meters
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

// Validate location based on user position
const validateLocation = async (userId, userLocation) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Manager can punch in/out from anywhere
    if (user.position === 'Manager') {
      return { isValid: true, message: 'Manager can punch in/out from anywhere' };
    }

    // For Employee, HR, Team Leader - must be at office location
    if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
      return {
        isValid: false,
        message: 'Location coordinates required for office-based positions'
      };
    }

    const distance = calculateDistance(
      COMPANY_LOCATION.latitude,
      COMPANY_LOCATION.longitude,
      userLocation.latitude,
      userLocation.longitude
    );

    if (distance <= COMPANY_LOCATION.allowedRadius) {
      return {
        isValid: true,
        message: `Within office premises (${Math.round(distance)}m from office)`
      };
    } else {
      return {
        isValid: false,
        message: `Outside office premises. You are ${Math.round(distance)}m away from office. Please be within ${COMPANY_LOCATION.allowedRadius}m radius.`
      };
    }
  } catch (error) {
    console.error('Location validation error:', error);
    return {
      isValid: false,
      message: 'Error validating location. Please try again.'
    };
  }
};

export const punchInController = async (req, res) => {
  try {
    const { punchInTime, punchInLocation, selfieImage, userLocation } = req.body;
    const { userId, companyId } = req.user;

    // Validation
    if (!selfieImage) return res.status(400).json({ message: 'Selfie required' });
    if (!/^data:image\/(png|jpeg|jpg);base64,/.test(selfieImage)) {
      return res.status(400).json({ message: 'Invalid image format' });
    }

    // Location validation
    const locationValidation = await validateLocation(userId, userLocation);
    if (!locationValidation.isValid) {
      return res.status(400).json({
        message: locationValidation.message,
        locationError: true
      });
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
          punchInPhoto: selfieImage,
          punchInLocation: punchInLocation || COMPANY_LOCATION.name
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
    attendance.punchInLocation = punchInLocation || COMPANY_LOCATION.name;
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
      remark: attendance.remark,
      location: attendance.punchInLocation,
      locationValidation: locationValidation.message
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
    const { punchOutTime, punchOutLocation, emergencyReason, selfieImage, userLocation } = req.body;
    const { userId, companyId } = req.user;
    // Validation
    if (!selfieImage) return res.status(400).json({ message: 'Selfie required' });
    if (!/^data:image\/(png|jpeg|jpg);base64,/.test(selfieImage)) {
      return res.status(400).json({ message: 'Invalid image format' });
    }

    // Location validation
    const locationValidation = await validateLocation(userId, userLocation);
    if (!locationValidation.isValid) {
      return res.status(400).json({
        message: locationValidation.message,
        locationError: true
      });
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
      attendance.punchOutLocation = punchOutLocation || COMPANY_LOCATION.name;
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
    attendance.punchOutLocation = punchOutLocation || COMPANY_LOCATION.name;

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
      status: attendance.status,
      location: attendance.punchOutLocation,
      locationValidation: locationValidation.message
    });

  } catch (error) {
    console.error('Punch-out error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper function to get company location info
export const getCompanyLocationController = async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      companyLocation: COMPANY_LOCATION,
      userPosition: user.position,
      requiresLocationValidation: user.position !== 'Manager',
      message: user.position === 'Manager'
        ? 'As a Manager, you can punch in/out from anywhere'
        : `You must be within ${COMPANY_LOCATION.allowedRadius}m of the office to punch in/out`
    });
  } catch (error) {
    console.error('Get company location error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

export const getTodayAttendance = async (req, res) => {
  try {
    const { userId, companyId } = req.user;
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
    const { userId, companyId } = req.user;
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

export const getPositionWiseAttendance = async (req, res) => {
  try {
    const { companyId, position, userId } = req.user;

    if (!companyId) {
      return res.status(400).json({ message: "Missing company ID in cookie" });
    }

    let attendanceRecords = [];

    if (position === "TeamLeader") {
      // Find earliest task assigned to this TeamLeader
      const task = await TaskAssignment.findOne({
        companyId: new mongoose.Types.ObjectId(companyId),
        assignedTo: new mongoose.Types.ObjectId(userId),
      }).sort({ assignDate: 1 });

      console.log("Task found for TeamLeader:", task);

      if (!task || !task.tagMembers || task.tagMembers.length === 0) {
        return res.status(200).json([]); // no task or no team members found
      }

      // Use all team member IDs from tagMembers
      const teamMemberIds = task.tagMembers.map((id) => new mongoose.Types.ObjectId(id));

      attendanceRecords = await Attendance.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(companyId),
            userId: { $in: teamMemberIds },
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
        { $unwind: "$userInfo" },
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
        { $sort: { date: -1 } },
      ]);
    } else if (position === "Manager" || position === "HR") {
      attendanceRecords = await Attendance.aggregate([
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
        { $unwind: "$userInfo" },
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
        { $sort: { date: -1 } },
      ]);
    } else {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    return res.status(200).json(attendanceRecords || []);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return res.status(500).json({
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