// controllers/attendanceController.js
import mongoose from "mongoose";
import Attendance from "../models/attendance.model.js";
import LocationSetting from "../models/locationSetting.model.js";
import User from "../models/user.model.js";
import { calculateHours, getStartOfDayUTC } from "../utils/attendance.utils.js";

// Convert base64 image string to buffer
const base64ToBuffer = (base64) => {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, "base64");
};

// Convert buffer to base64 string with mime type
const bufferToBase64 = (buffer, mime = "image/jpeg") => {
  return `data:${mime};base64,${buffer.toString("base64")}`;
};

// Calculate distance (meters) using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};


export const getEmployees = async(req,res)=>{
  try {
    const {companyId, adminId} = req.user;
    if(!companyId || !adminId) {
      return res.status(400).json({ message: "Invalid request" });
    }

    // Fetch all employees in the company
    const employees = await User.find({ companyId, position: { $ne: "Admin" } })
      .select("firstName lastName email position photoUrl")
      .lean();

    const totalCount = employees.length;
    if (!employees || employees.length === 0) {
      return res.status(404).json({ message: "No employees found" });
    }
    res.status(200).json({totalCount,employees});
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Server error", error: error.message });
    
  }
}
export const punchInController = async (req, res) => {
  try {
    const {
      punchInTime,
      punchInLocation,
      selfieImage,
      selfiePublicId,
      userLocation,
    } = req.body;
    const { userId, companyId } = req.user;

    // Updated validation to check for Cloudinary URL instead of base64
    if (
      !selfieImage ||
      !selfieImage.startsWith("https://res.cloudinary.com/")
    ) {
      return res
        .status(400)
        .json({ message: "Valid selfie image URL required from Cloudinary." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.position !== "Manager") {
      if (!userLocation?.latitude ||
        !userLocation?.longitude) {
        return res
          .status(400)
          .json({ message: "User location is required for punch-in" });
      }
      const locationSetting = await LocationSetting.findOne({ companyId });

      if (locationSetting) {
        const { latitude, longitude, allowedRadius } = locationSetting;
        const distance = calculateDistance(
          latitude,
          longitude,
          userLocation.latitude,
          userLocation.longitude,
        );
        if (distance > allowedRadius) {
          return res.status(400).json({
            message: `You are ${Math.round(
              distance,
            )}m away from the allowed area. Max allowed: ${allowedRadius}m.`,
            locationError: true,
          });
        }
      }
    }

    const today = new Date(getStartOfDayUTC());
    const existingAttendance = await Attendance.findOne({
      userId,
      companyId,
      date: today
    });
    if (existingAttendance && existingAttendance.punchIn) {
      return res
        .status(400)
        .json({ message: "You have already punched in today" });
    }

    const punchInDateTime = punchInTime ? new Date(punchInTime) : new Date();
    if (isNaN(punchInDateTime)) {
      return res.status(400).json({ message: "Invalid punch-in time" });
    }

    const attendance = new Attendance({
      userId,
      companyId,
      date: today,
      punchIn: punchInDateTime,
      punchInLocation: punchInLocation || "Office",
      remark: "Present",
      status: "Present",
      punchInPhoto: selfieImage, // Store Cloudinary URL directly
      punchInPhotoPublicId: selfiePublicId, // Store public ID for potential deletion
    });

    await attendance.save();

    res.status(200).json({
      message: "Punch-in successful",
      punchInTime: attendance.punchIn,
      photoUrl: selfieImage,
    });
  } catch (error) {
    console.error("Punch-in error.", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

export const punchOutController = async (req, res) => {
  try {
    const {
      punchOutTime,
      punchOutLocation,
      emergencyReason,
      selfieImage,
      selfiePublicId,
      userLocation,
    } = req.body;
    const { userId, companyId } = req.user;

    // Updated validation to check for Cloudinary URL instead of base64
    if (
      !selfieImage ||
      !selfieImage.startsWith("https://res.cloudinary.com/")
    ) {
      return res
        .status(400)
        .json({ message: "Valid selfie image URL required from Cloudinary." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.position !== "Manager") {
      if (!userLocation?.latitude ||
        !userLocation?.longitude) {
        return res
          .status(400)
          .json({ message: "User location is required for punch-out" });
      }
      const locationSetting = await LocationSetting.findOne({ companyId });

      if (locationSetting) {
        const { latitude, longitude, allowedRadius } = locationSetting;
        const distance = calculateDistance(
          latitude,
          longitude,
          userLocation.latitude,
          userLocation.longitude,
        );
        if (distance > allowedRadius) {
          return res.status(400).json({
            message: `You are ${Math.round(
              distance,
            )}m away from the allowed area. Max allowed: ${allowedRadius}m.`,
            locationError: true,
          });
        }
      }
    }

    const today = new Date(getStartOfDayUTC());
    const attendance = await Attendance.findOne({
      userId,
      companyId,
      date: today
    });
    if (!attendance || !attendance.punchIn) {
      return res
        .status(400)
        .json({ message: "Punch-in required before punch-out" });
    }
    if (attendance.punchOut) {
      return res
        .status(400)
        .json({ message: "You have already punched out today" });
    }

    const punchOutDateTime = punchOutTime ? new Date(punchOutTime) : new Date();
    if (isNaN(punchOutDateTime)) {
      return res.status(400).json({ message: "Invalid punch-out time" });
    }

    const hoursWorked = calculateHours(attendance.punchIn, punchOutDateTime);
    let status = "Absent";

    if (emergencyReason) {
      status = "Emergency";
    } else if (hoursWorked >= 8) {
      status = "Present";
    } else if (hoursWorked >= 4) {
      status = "Half-Day";
    }

    attendance.punchOut = punchOutDateTime;
    attendance.punchOutLocation = punchOutLocation || "Office";
    attendance.punchOutPhoto = selfieImage; // Store Cloudinary URL directly
    attendance.punchOutPhotoPublicId = selfiePublicId; // Store public ID for potential deletion
    attendance.hoursWorked = hoursWorked;
    attendance.status = status;
    attendance.remark = status;
    attendance.emergencyReason = emergencyReason;

    await attendance.save();

    res.status(200).json({
      message: "Punch-out successful",
      punchOutTime: attendance.punchOut,
      photoUrl: selfieImage,
      hoursWorked,
      status,
    });
  } catch (error) {
    console.error("Punch-out error.", error);
    res.status(500).json({ message: "Server error.", error: error.message });
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
        status: "Absent",
      });
    }

    res.status(200).json({
      punchedIn: !!attendance.punchIn,
      punchInTime: attendance.punchIn || null,
      punchInLocation: attendance.punchInLocation || null,
      punchInPhoto: attendance.punchInPhoto || null, // Add this line
      punchedOut: !!attendance.punchOut,
      punchOutTime: attendance.punchOut || null,
      punchOutLocation: attendance.punchOutLocation || null,
      punchOutPhoto: attendance.punchOutPhoto || null, // Add this line
      status: attendance.status || "Pending",
      remark: attendance.remark || null,
      totalWorkedHours: attendance.totalWorkedHours || 0,
      overtime: attendance.overtime || 0,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({
      message: "Server error fetching attendance",
      error: error.message,
    });
  }
};

export const getParticularUserAttendance = async (req, res) => {
  try {
    const { userId, companyId } = req.user;
    const { month, year } = req.query;

    let matchCondition = { userId, companyId };

    // Add month/year filtering if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      matchCondition.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const attendance = await Attendance.find(matchCondition).sort({
      date: -1,
    });

    // Return empty array instead of 404 when no records found
    res.status(200).json(attendance || []);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({
      message: "Server error fetching attendance",
      error: error.message,
    });
  }
};

export const getAllAttendance = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { userId, month, year } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: "Missing company ID in cookie" });
    }

    // Build match condition
    const matchCondition = {
      companyId: new mongoose.Types.ObjectId(companyId),
    };

    if (userId) {
      // Validate ObjectId format to prevent errors
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid userId format" });
      }
      matchCondition.userId = new mongoose.Types.ObjectId(userId);
    }

    // Add month/year filtering if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      matchCondition.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const attendanceRecords = await Attendance.aggregate([
      {
        $match: matchCondition,
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
          punchInPhoto: 1,
          punchOutPhoto: 1,
          punchIn: 1,
          punchInLocation: 1,
          punchOut: 1,
          totalWorkedHours: 1,
          overtime: 1,
          status: 1,
          remark: 1,
          emergencyReason: 1,
          "userInfo.photoUrl": 1,
          "userInfo.firstName": 1,
          "userInfo.lastName": 1,
          "userInfo.email": 1,
          "userInfo.position": 1,
        },
      },
      {
        $sort: { date: -1 },
      },
    ]);

    res.status(200).json(attendanceRecords || []);
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
    const { month, year } = req.query;

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
      const teamMemberIds = task.tagMembers.map(
        (id) => new mongoose.Types.ObjectId(id),
      );

      // Build match condition for team members
      const matchCondition = {
        companyId: new mongoose.Types.ObjectId(companyId),
        userId: { $in: teamMemberIds },
      };

      // Add month/year filtering if provided
      if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        matchCondition.date = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      attendanceRecords = await Attendance.aggregate([
        {
          $match: matchCondition,
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
      // Build match condition for all company employees
      const matchCondition = {
        companyId: new mongoose.Types.ObjectId(companyId),
      };

      // Add month/year filtering if provided
      if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        matchCondition.date = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      attendanceRecords = await Attendance.aggregate([
        {
          $match: matchCondition,
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
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export async function processAbsentees() {
  try {
    const todayStart = getStartOfTodayUTC();
    const todayDay = todayStart.getUTCDay(); // 0 (Sun) - 6 (Sat)
    const users = await User.find({});
    const Company = (await import("../models/companyregistration.model.js")).default;

    for (const user of users) {
      // Fetch company attendance settings
      const company = await Company.findById(user.companyId);
      const workingDays = company?.attendanceSettings?.workingDays || [1, 2, 3, 4, 5]; // Default: Mon-Fri
      // workingDays: [0,1,2,3,4,5,6] (0=Sun, 1=Mon, ...)
      if (!workingDays.includes(todayDay)) {
        // Not a working day for this company, skip marking absent
        continue;
      }
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
          status: "Absent",
          remark: "Absent",
        }).save();
        console.log(
          `🚫 Marked Absent: ${user._id} for ${todayStart.toISOString().split("T")[0]}`,
        );
      }
    }
    console.log(
      `✅ All absentees processed for ${todayStart.toISOString().split("T")[0]}`,
    );
  } catch (error) {
    console.error("❌ Error running absentee cron job:", error.message);
  }
}

// Admin: Edit punch-in/out time for a user's attendance
export const editAttendanceTimeController = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const {
      punchIn,
      punchOut,
      punchInLocation,
      punchOutLocation,
      remark,
      status,
    } = req.body;

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    if (punchIn) attendance.punchIn = new Date(punchIn);
    if (punchOut) attendance.punchOut = new Date(punchOut);
    if (punchInLocation) attendance.punchInLocation = punchInLocation;
    if (punchOutLocation) attendance.punchOutLocation = punchOutLocation;
    if (remark) attendance.remark = remark;
    if (status) attendance.status = status;

    // Optionally recalculate hoursWorked if both times are present
    if (attendance.punchIn && attendance.punchOut) {
      attendance.hoursWorked = calculateHours(attendance.punchIn, attendance.punchOut);
    }

    await attendance.save();
    res.status(200).json({ message: "Attendance updated successfully", attendance });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get monthly attendance summary for a user
export const getMonthlyAttendanceSummary = async (req, res) => {
  try {
    // Take userId from params if present, else from req.user
    const userId = req.params.userId
    const { companyId } = req.user;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }
    // Validate userId as ObjectId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid or missing userId" });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);

    // Fetch user details
    const user = await User.findById(userId, {
      firstName: 1,
      lastName: 1,
      email: 1,
      position: 1,
      gender: 1,
      photoUrl: 1,
      _id: 0,
    }).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch attendance records with projection
    const records = await Attendance.find(
      {
        userId,
        companyId,
        date: { $gte: startDate, $lte: endDate },
      },
      {
        date: 1,
        status: 1,
        remark: 1,
        punchIn: 1,
        punchOut: 1,
        punchInLocation: 1,
        punchOutLocation: 1,
        punchInPhoto: 1,
        punchOutPhoto: 1,
        totalWorkedHours: 1,
        overtime: 1,
        _id: 0,
      }
    ).lean();

    // Calculate summary only from existing records
    const summary = {
      Present: 0,
      Absent: 0,
      "Half-Day": 0,
      Emergency: 0,
      Other: 0,
    };

    records.forEach((rec) => {
      const status = rec.status || "Absent";
      if (summary.hasOwnProperty(status)) {
        summary[status]++;
      } else {
        summary.Other++;
      }
    });

    // Prepare daily array only from records
    const daily = records.map((rec) => ({
      date: new Date(rec.date).toISOString().split("T")[0],
      status: rec.status || "Absent",
      remark: rec.remark || null,
      punchInTime: rec.punchIn || null,
      punchOutTime: rec.punchOut || null,
      punchInLocation: rec.punchInLocation || null,
      punchOutLocation: rec.punchOutLocation || null,
      punchInPhoto: rec.punchInPhoto || null,
      punchOutPhoto: rec.punchOutPhoto || null,
      totalWorkedHours: rec.totalWorkedHours || 0,
      overtime: rec.overtime || 0,
    }));

    res.status(200).json({
      userId,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email || null,
      position: user.position || null,
      gender: user.gender || null,
      photoUrl: user.photoUrl || null,
      month: m,
      year: y,
      summary,
      daily,
    });
  } catch (error) {
    console.error("Error fetching monthly attendance summary:", error);
    res.status(500).json({
      message: "Server error fetching monthly attendance summary",
      error: error.message,
    });
  }
};

export const getSingleUserMonthlyAttendanceSummary = async (req, res) => {
  try {
    // Take userId from params if present, else from req.user
    const userId = req.params.userId || req.user.userId;
    const { companyId } = req.user;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }
    // Validate userId as ObjectId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid or missing userId" });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);

    // Fetch user details
    const user = await User.findById(userId, {
      firstName: 1,
      lastName: 1,
      email: 1,
      position: 1,
      gender: 1,
      photoUrl: 1,
      _id: 0,
    }).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch attendance records with projection
    const records = await Attendance.find(
      {
        userId,
        companyId,
        date: { $gte: startDate, $lte: endDate },
      },
      {
        date: 1,
        status: 1,
        remark: 1,
        punchIn: 1,
        punchOut: 1,
        punchInLocation: 1,
        punchOutLocation: 1,
        punchInPhoto: 1,
        punchOutPhoto: 1,
        totalWorkedHours: 1,
        overtime: 1,
        _id: 0,
      }
    ).lean();

    // Calculate summary only from existing records
    const summary = {
      Present: 0,
      Absent: 0,
      "Half-Day": 0,
      Emergency: 0,
      Other: 0,
    };

    records.forEach((rec) => {
      const status = rec.status || "Absent";
      if (summary.hasOwnProperty(status)) {
        summary[status]++;
      } else {
        summary.Other++;
      }
    });

    // Prepare daily array only from records
    const daily = records.map((rec) => ({
      date: new Date(rec.date).toISOString().split("T")[0],
      status: rec.status || "Absent",
      remark: rec.remark || null,
      punchInTime: rec.punchIn || null,
      punchOutTime: rec.punchOut || null,
      punchInLocation: rec.punchInLocation || null,
      punchOutLocation: rec.punchOutLocation || null,
      punchInPhoto: rec.punchInPhoto || null,
      punchOutPhoto: rec.punchOutPhoto || null,
      totalWorkedHours: rec.totalWorkedHours || 0,
      overtime: rec.overtime || 0,
    }));

    res.status(200).json({
      userId,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email || null,
      position: user.position || null,
      gender: user.gender || null,
      photoUrl: user.photoUrl || null,
      month: m,
      year: y,
      summary,
      daily,
    });
  } catch (error) {
    console.error("Error fetching monthly attendance summary:", error);
    res.status(500).json({
      message: "Server error fetching monthly attendance summary",
      error: error.message,
    });
  }
};
