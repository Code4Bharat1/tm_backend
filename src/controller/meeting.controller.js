import Meeting from '../models/meeting.model.js';
import { createZoomMeeting } from '../utils/zoom.js';
import User from '../models/user.model.js';
import Admin from '../models/admin.model.js';

export const createMeeting = async (req, res) => {
    try {
        const { host: hostName, title, description, date, time, duration, participants } = req.body;
        const allowedPositions = ['HR', 'Manager', 'TeamLeader'];

        // Split the hostName into parts for user lookup
        const nameParts = hostName.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        // Find potential hosts
        let host;
        let hostId;

        // First check users (using first and last name)
        const userQuery = lastName 
            ? { firstName, lastName }
            : { firstName };
            
        const users = await User.find(userQuery);
        let validUsers = [];

        if (users.length > 0) {
            validUsers = users.filter(user => allowedPositions.includes(user.position));
            
            // If users exist but none are valid
            if (validUsers.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: `User with position '${users[0].position}' is not allowed to host meetings`
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
                error: 'No matching host found with required permissions'
            });
        }

        if (potentialHosts.length > 1) {
            return res.status(400).json({
                success: false,
                error: 'Multiple hosts found with this name',
                options: potentialHosts.map(h => ({
                    id: h._id,
                    type: h instanceof Admin ? 'admin' : 'user',
                    email: h.email,
                    name: h instanceof Admin ? h.fullName : `${h.firstName} ${h.lastName}`,
                    ...(h instanceof User && { position: h.position })
                })),
                message: 'Please resubmit with the specific host ID'
            });
        }

        // Exactly one match found
        host = potentialHosts[0];
        hostId = host._id;

        // Create Zoom meeting
        const dateTime = new Date(`${date}T${time}`);
        const zoomMeeting = await createZoomMeeting({
            title,
            description,
            dateTime,
            duration: duration === '30 minutes' ? 30 : 60
        });

        // Save meeting to database
        const newMeeting = new Meeting({
            host: hostId,
            title,
            description,
            date,
            time,
            duration,
            participants,
            meetingLink: zoomMeeting.join_url,
            zoomMeetingId: zoomMeeting.id
        });

        await newMeeting.save();

        res.status(201).json({
            success: true,
            meeting: {
                ...newMeeting._doc,
                meetingLink: zoomMeeting.join_url,
                hostName: host instanceof Admin ? host.fullName : `${host.firstName} ${host.lastName}`
            }
        });

    } catch (error) {
        console.error('Meeting creation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const getMeetings = async (req, res) => {
    try {
        const meetings = await Meeting.find()
            .populate({
                path: 'host',
                select: 'firstName lastName email position fullName',
                transform: doc => {
                    if (!doc) return null;
                    return {
                        ...doc._doc,
                        name: doc.fullName || `${doc.firstName} ${doc.lastName}`
                    };
                }
            })
            .populate('participants', 'firstName lastName email fullName');

        // Format host names consistently
        const formattedMeetings = meetings.map(meeting => ({
            ...meeting._doc,
            host: {
                ...meeting.host._doc,
                name: meeting.host.fullName || `${meeting.host.firstName} ${meeting.host.lastName}`
            }
        }));

        res.json({ success: true, meetings: formattedMeetings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};