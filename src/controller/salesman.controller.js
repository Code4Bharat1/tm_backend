import SalesmanVisit from "../models/salesman.model.js";
import User from "../models/user.model.js";
import { uploadFileToWasabi } from "../utils/wasabi.utils.js";

export const isSalesman = async (userId) => {
  const user = await User.findById(userId);
  return user && user.position === "Salesman";
};

// Punch In
export const punchIn = async (req, res) => {
  try {
    const { userId, companyId } = req.user;
    const { latitude, longitude, notes } = req.body;
    let photoUrl = null;
    if (req.file && req.file.buffer && req.file.originalname) {
      try {
        const uploadResult = await uploadFileToWasabi({
          buffer: req.file.buffer,
          originalName: req.file.originalname,
          folder: `salesman-punchin/${userId}`,
          mimetype: req.file.mimetype,
        });
        photoUrl = uploadResult.fileUrl;
      } catch (uploadErr) {
        return res.status(500).json({ error: "Failed to upload image to Wasabi", details: uploadErr.message });
      }
    }

    if (!(await isSalesman(userId))) {
      return res
        .status(403)
        .json({ error: "User is not a Salesman or not found" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let visitDoc = await SalesmanVisit.findOne({
      userId,
      companyId,
      date: today,
    });

    if (!visitDoc) {
      visitDoc = new SalesmanVisit({
        userId,
        companyId,
        date: today,
        visits: [],
      });
    }

    visitDoc.visits.push({
      punchIn: new Date(),
      punchInPhoto: photoUrl,
      punchInLocation: { latitude, longitude },
      notes,
    });

    await visitDoc.save();

    res
      .status(200)
      .json({ message: "Punch-in recorded successfully", visit: visitDoc });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Punch Out
export const punchOut = async (req, res) => {
  try {
    const { userId, companyId } = req.user;
    const { latitude, longitude } = req.body;
    let photoUrl = null;
    if (req.file && req.file.buffer && req.file.originalname) {
      try {
        const uploadResult = await uploadFileToWasabi({
          buffer: req.file.buffer,
          originalName: req.file.originalname,
          folder: `salesman-punchout/${userId}`,
          mimetype: req.file.mimetype,
        });
        photoUrl = uploadResult.fileUrl;
      } catch (uploadErr) {
        return res.status(500).json({ error: "Failed to upload image to Wasabi", details: uploadErr.message });
      }
    }

    if (!(await isSalesman(userId))) {
      return res
        .status(403)
        .json({ error: "User is not a Salesman or not found" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const visitDoc = await SalesmanVisit.findOne({
      userId,
      companyId,
      date: today,
    });

    if (!visitDoc) {
      return res
        .status(400)
        .json({ error: "No punch-in record found for today" });
    }

    const lastVisit = [...visitDoc.visits]
      .reverse()
      .find((visit) => !visit.punchOut);
    if (!lastVisit) {
      return res
        .status(400)
        .json({ error: "No open punch-in found to punch-out" });
    }

    lastVisit.punchOut = new Date();
    lastVisit.punchOutPhoto = photoUrl;
    lastVisit.punchOutLocation = { latitude, longitude };

    await visitDoc.save();

    res
      .status(200)
      .json({ message: "Punch-out recorded successfully", visit: visitDoc });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};
// Get all visits
export const getVisits = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select("name position");
    if (!user || user.position !== "Salesman") {
      return res
        .status(403)
        .json({ error: "User is not a Salesman or not found" });
    }

    // Get all visit documents for the salesman
    const visitsDocs = await SalesmanVisit.find({ userId }).sort({ date: -1 });

    const visits = visitsDocs.flatMap((doc) =>
      doc.visits.map((visit) => ({
        date: doc.date,
        punchIn: visit.punchIn,
        punchInPhoto: visit.punchInPhoto,
        punchInLocation: visit.punchInLocation,
        punchOut: visit.punchOut,
        punchOutPhoto: visit.punchOutPhoto,
        punchOutLocation: visit.punchOutLocation,
        notes: visit.notes,
      })),
    );

    res.status(200).json({
      name: user.name,
      totalVisits: visits.length,
      visits,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

export const getVisitsByCompany = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }

    const query = { companyId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const visits = await SalesmanVisit.find(query)
      .populate({
        path: "userId",
        select: "name email",
      })
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await SalesmanVisit.countDocuments(query);

    res.json({
      data: visits,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching visits:", error);
    res.status(500).json({ error: "Server error" });
  }
};
