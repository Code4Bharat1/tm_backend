import axios from 'axios';

const ZOOM_CONFIG = {
  clientId: process.env.ZOOM_CLIENT_ID,
  clientSecret: process.env.ZOOM_CLIENT_SECRET,
  accountId: process.env.ZOOM_ACCOUNT_ID
};

export const createZoomMeeting = async (meetingDetails) => {
  try {
    // Get Zoom access token
    const authResponse = await axios.post(
      'https://zoom.us/oauth/token',
      `grant_type=account_credentials&account_id=${ZOOM_CONFIG.accountId}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${ZOOM_CONFIG.clientId}:${ZOOM_CONFIG.clientSecret}`).toString('base64')}`
        }
      }
    );

    const { access_token } = authResponse.data;

    // Create Zoom meeting
    const meetingPayload = {
      topic: meetingDetails.title,
      type: 2,
      start_time: meetingDetails.dateTime.toISOString(),
      duration: meetingDetails.duration,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      agenda: meetingDetails.description,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        waiting_room: true
      }
    };

    const meetingResponse = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      meetingPayload,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return meetingResponse.data;
  } catch (error) {
    console.error('Zoom API Error:', error.response?.data || error.message);
    throw new Error('Failed to create Zoom meeting');
  }
};