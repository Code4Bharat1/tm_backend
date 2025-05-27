import Ticket from "../models/raiseTicket.model.js";
import User from '../models/user.model.js'
export const raiseTicket = async (req, res) => {
  try {
    const { userId, companyId } = req.user;
    if (!userId || !companyId)
      return res
        .status(401)
        .json({ message: "User ID and Company ID are required" });

    const { selectedUserId, title, msg } = req.body;
    if (!selectedUserId || !title || !msg)
      return res
        .status(400)
        .json({ message: "Selected User ID, Title and Message are required" });

    const ticket = new Ticket({
      userId,
      companyId,
      selectedUserId,
      title,
      msg,
    });
    await ticket.save();
    res.status(201).json({ message: "Ticket raised successfully", ticket });
  } catch (error) {
    console.error("Error raising ticket", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const fetchTicket = async (req, res) => {
  try {
    const { userId, companyId } = req.user;

    if (!userId || !companyId) {
      return res
        .status(401)
        .json({ message: "User ID and Company ID are required" });
    }

    // Fetch all tickets where the user is either the raiser or the assignee
    const tickets = await Ticket.find({
      companyId,
      $or: [{ userId: userId }, { selectedUserId: userId }],
    })
      .populate("userId", "firstName lastName")
      .populate("selectedUserId", "firstName lastName")
      .sort({ createdAt: -1 });

    // Categorize tickets
    const raisedByMe = tickets.filter(
      (ticket) => ticket.userId._id.toString() === userId,
    );
    const raisedToMe = tickets.filter(
      (ticket) => ticket.selectedUserId._id.toString() === userId,
    );

    res.status(200).json({
      raisedByMe,
      raisedToMe,
    });
  } catch (error) {
    console.error("Error fetching tickets", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { userId, companyId } = req.user;
    if (!userId || !companyId)
      return res
        .status(401)
        .json({ message: "User ID and Company ID are required" });

    const { ticketId, status } = req.body;
    if (!ticketId || !status)
      return res
        .status(400)
        .json({ message: "Ticket ID and Status are required" });

    const ticket = await Ticket.findOneAndUpdate(
      { _id: ticketId, companyId },
      { status },
      { new: true },
    );

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.status(200).json({ message: "Ticket updated successfully", ticket });
  } catch (error) {
    console.error("Error updating ticket", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllUserEmails = async (req, res) => {
  try {
    const { userId, companyId } = req.user;

    if (!userId || !companyId) {
      return res
        .status(401)
        .json({ message: "User ID and Company ID are required" });
    }

    const users = await User.find(
      {
        companyId,
        _id: { $ne: userId }, // Exclude the logged-in user
      },
      "firstName lastName email _id",
    );

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching user emails:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
