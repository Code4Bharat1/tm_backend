import Ticket from "../models/raiseTicket.model.js";
import User from "../models/user.model.js";
import TaskAssignment from "../models/taskAssignment.model.js";

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

// Raise a ticket by client
export const raiseTicketByClient = async (req, res) => {
  try {
    const { clientId } = req.user; // Auth middleware should populate client info
    if (!clientId) {
      return res.status(401).json({ message: "Client ID is required" });
    }

    const { title, msg } = req.body;
    if (!title || !msg) {
      return res
        .status(400)
        .json({ message: "Title and message are required" });
    }

    // Find users assigned to the client's project(s)
    const assignedTasks = await TaskAssignment.find({
      clientId,
      projectCategory: "Client",
    }).select("assignedTo companyId");

    if (assignedTasks.length === 0) {
      return res
        .status(404)
        .json({ message: "No assigned users found for this client" });
    }

    const uniqueUserIds = [
      ...new Set(assignedTasks.map((task) => task.assignedTo.toString())),
    ];
    const companyId = assignedTasks[0].companyId; // Assumes all tasks belong to same company

    // Raise a ticket to each assigned user
    const ticketPromises = uniqueUserIds.map((userId) =>
      new Ticket({
        userId: clientId, // Client is raising the ticket
        companyId,
        selectedUserId: userId,
        title,
        msg,
      }).save(),
    );

    const savedTickets = await Promise.all(ticketPromises);

    res.status(201).json({
      message: "Ticket(s) raised successfully",
      count: savedTickets.length,
      tickets: savedTickets,
    });
  } catch (error) {
    console.error("Error in raiseTicketByClient:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const fetchTicketByClient = async (req, res) => {
  try {
    const { clientId } = req.user; // Ensure auth middleware provides this

    if (!clientId) {
      return res.status(401).json({ message: "Client ID is required" });
    }

    // Find tickets raised by the client
    const tickets = await Ticket.find({ userId: clientId })
      .populate("selectedUserId", "firstName lastName email")
      .sort({ createdAt: -1 });

    if (!tickets || tickets.length === 0) {
      return res.status(200).json({ message: "No tickets found", tickets: [] });
    }

    res.status(200).json({
      message: "Tickets fetched successfully",
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error("Error in fetchTicketByClient:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
