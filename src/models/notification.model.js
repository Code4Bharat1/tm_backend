    // models/notification.model.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['Task', 'Post', 'Project', 'Alert', 'Reminder', 'Custom','EventReminder'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },

    // Optional references based on type
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskAssignment',
      default: null,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    reminderId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"Reminder",
      default:null
    },

    // Optional redirect link (frontend)
    url: {
      type: String,
      default: null,
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Notification', notificationSchema);
