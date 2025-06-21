import User from "../models/user.model.js";
import TaskAssignment from "../models/taskAssignment.model.js";

export const searchAll = async (req, res) => {
  const query = req.query.q;
  const { adminId, companyId } = req.user;
  if (!query) {
    return res.status(400).json({ message: "Query parameter is required" });
  }
  try {
    // Search in User model, filter by companyId
    const users = await User.find({
      companyId: companyId,
      $or: [
        { firstName: { $regex: query, $options: "i" } },
        { lastName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { userId: { $regex: query, $options: "i" } },
      ],
    });

    // Search in TaskAssignment model, filter by companyId and assignedBy (adminId)
    const tasks = await TaskAssignment.find({
      companyId: companyId,
      assignedBy: adminId,
      $or: [
        { bucketName: { $regex: query, $options: "i" } },
        { projectCategory: { $regex: query, $options: "i" } },
        { status: { $regex: query, $options: "i" } },
      ],
    }).populate("assignedTo", "firstName lastName userId");

    return res.status(200).json({ users, tasks });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};
