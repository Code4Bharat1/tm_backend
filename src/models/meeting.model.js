import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  date: {
    type: Date,
    required: true
  },
  time: String,
  duration: {
    type: String,
    enum: ['15 minutes', '30 minutes', '1 hour', "1 hour 30 minutes"],
    required: true
  },
  participants: [String],
  meetingLink: {
    type: String,
    required: true
  },
  zoomMeetingId: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Meeting', meetingSchema);