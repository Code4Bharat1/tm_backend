import Meeting from "../models/meeting.model.js";
import { createZoomMeeting } from "../utils/zoom.js";
import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";
import { sendMail } from "../service/nodemailerConfig.js";

export const createMeeting = async (req, res) => {
  try {
    const {
      host: hostName,
      title,
      description,
      date,
      time,
      duration,
      participants: participantEmails,
    } = req.body;
    const allowedPositions = ["HR", "Manager", "TeamLeader"];

    // Split the hostName into parts for user lookup
    const nameParts = hostName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    // Find potential hosts
    let host;
    let hostId;

    // First check users (using first and last name)
    const userQuery = lastName ? { firstName, lastName } : { firstName };

    const users = await User.find(userQuery);
    let validUsers = [];

    if (users.length > 0) {
      validUsers = users.filter((user) =>
        allowedPositions.includes(user.position),
      );

      // If users exist but none are valid
      if (validUsers.length === 0) {
        return res.status(403).json({
          success: false,
          error: `User with position '${users[0].position}' is not allowed to host meetings`,
        });
      }
    }

    // Then check admins (using full name)
    const admins = await Admin.find({ fullName: hostName });

    // Combine results
    const potentialHosts = [...validUsers, ...admins];

    // Handle different match scenarios
    if (potentialHosts.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No matching host found with required permissions",
      });
    }

    if (potentialHosts.length > 1) {
      return res.status(400).json({
        success: false,
        error: "Multiple hosts found with this name",
        options: potentialHosts.map((h) => ({
          id: h._id,
          type: h instanceof Admin ? "admin" : "user",
          email: h.email,
          name:
            h instanceof Admin ? h.fullName : `${h.firstName} ${h.lastName}`,
          ...(h instanceof User && { position: h.position }),
        })),
        message: "Please resubmit with the specific host ID",
      });
    }

    // Exactly one match found
    host = potentialHosts[0];
    hostId = host._id;

    // Convert participant emails to user IDs
    const participantUsers = await User.find({
      email: { $in: participantEmails },
    });
    const participantIds = participantUsers.map((user) => user._id);

    // Create Zoom meeting
    const dateTime = new Date(`${date}T${time}`);
    const zoomMeeting = await createZoomMeeting({
      title,
      description,
      dateTime,
      duration: duration === "30 minutes" ? 30 : 60,
    });

    // Save meeting to database
    const newMeeting = new Meeting({
      host: hostId,
      title,
      description,
      date,
      time,
      duration,
      participants: participantIds, // Now storing IDs instead of emails
      meetingLink: zoomMeeting.join_url,
      zoomMeetingId: zoomMeeting.id,
    });

    await newMeeting.save();

    for (const user of participantUsers) {
      await sendMail(
        user.email,
        `Meeting Invitation: ${title}`,
        `Hello ${
          user.firstName
        },\n\nYou have been invited to a meeting.\n\nTitle: ${title}\nDescription: ${description}\nDate: ${date}\nTime: ${time}\nDuration: ${duration}\nLink: ${
          zoomMeeting.join_url
        }\n\nRegards,\n${
          host instanceof Admin
            ? host.fullName
            : `${host.firstName} ${host.lastName}`
        }`,
      );
    }

    res.status(201).json({
      success: true,
      meeting: {
        ...newMeeting._doc,
        meetingLink: zoomMeeting.join_url,
        hostName:
          host instanceof Admin
            ? host.fullName
            : `${host.firstName} ${host.lastName}`,
        // Optionally include participant details in response if needed
        participants: participantUsers.map((user) => ({
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
        })),
      },
    });
  } catch (error) {
    console.error("Meeting creation error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find()
      .populate({
        path: "host",
        select: "firstName lastName email position fullName",
        transform: (doc) => {
          if (!doc) return null;
          return {
            ...doc._doc,
            name: doc.fullName || `${doc.firstName} ${doc.lastName}`,
          };
        },
      })
      .populate("participants", "firstName lastName email fullName");

    // Format host names consistently
    const formattedMeetings = meetings.map((meeting) => ({
      ...meeting._doc,
      host: {
        ...meeting.host._doc,
        name:
          meeting.host.fullName ||
          `${meeting.host.firstName} ${meeting.host.lastName}`,
      },
    }));

    res.json({ success: true, meetings: formattedMeetings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMeetingForParticipant = async (req, res) => {
  try {
    const { participantName } = req.body;

    if (!participantName) {
      return res.status(400).json({
        success: false,
        error: "Participant name is required",
      });
    }

    // Split the participant name into parts for lookup
    const nameParts = participantName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    // Find the user in the database
    const userQuery = lastName ? { firstName, lastName } : { firstName };

    const user = await User.findOne(userQuery);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "No matching participant found",
      });
    }

    // Find meetings where this user is a participant
    const meetings = await Meeting.find({
      participants: user._id,
    })
      .populate({
        path: "host",
        select: "firstName lastName fullName position",
        // Handle missing host documents
        options: { allowNull: true },
      })
      .select("title description date time duration meetingLink zoomMeetingId")
      .populate("participants", "firstName lastName email");

    if (meetings.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No meetings found for this participant",
      });
    }

    // Format the response with null checks
    const formattedMeetings = meetings.map((meeting) => {
      // Safe handling for missing host
      let hostName = "Unknown Host";
      let hostPosition = "Unknown";

      if (meeting.host) {
        hostName =
          meeting.host.fullName ||
          `${meeting.host.firstName} ${meeting.host.lastName}`;
        hostPosition = meeting.host.position || "Unknown";
      }

      return {
        id: meeting._id,
        title: meeting.title,
        description: meeting.description,
        date: meeting.date,
        time: meeting.time,
        duration: meeting.duration,
        meetingLink: meeting.meetingLink,
        zoomMeetingId: meeting.zoomMeetingId,
        host: hostName,
        hostPosition: hostPosition,
        participants: meeting.participants.map((p) => ({
          name: p.fullName || `${p.firstName} ${p.lastName}`,
          email: p.email,
        })),
      };
    });

    res.json({
      success: true,
      participant: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
      },
      meetings: formattedMeetings,
    });
  } catch (error) {
    console.error("Error fetching participant meetings:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
