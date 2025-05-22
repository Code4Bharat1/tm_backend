import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyRegistration',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  note: {
    type: String,
    required: true,
  },
  postType: {
    type: String,
    enum: ['announcement', 'meeting', 'training', 'policy', 'celebration', 'reminder'],
    default: 'announcement',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  targetAudience: {
    positions: [{
      type: String,
      enum: ['all', 'Employee', 'manager', 'Admin', 'HR', 'Developer', 'Designer', 'Analyst', 'Supervisor'],
    }],
    departments: [String], // For future department-based filtering
  },
  tags: [String],
  attachments: [{
    fileName: String,
    fileUrl: String,
    publicId: String,
    fileType: String,
    _id: false,
  }],
  schedule: {
    type: {
      type: String,
      enum: ['immediate', 'scheduled'],
      default: 'immediate',
    },
    scheduledAt: Date,
    timezone: String,
    recurring: {
      enabled: { type: Boolean, default: false },
      type: { type: String, enum: ['daily', 'weekly', 'monthly'] },
      endDate: Date,
    },
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'archived'],
    default: 'published',
  },
  readBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now },
    _id: false,
  }],
  publishedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Index for better query performance
postSchema.index({ companyId: 1, publishedAt: -1 });
postSchema.index({ 'targetAudience.positions': 1 });

const Post = mongoose.model('Post', postSchema);
export default Post;