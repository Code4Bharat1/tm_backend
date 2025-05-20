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
    required: false, // Optional if post isn't company-specific
  },
  message: {
    type: String,
    default: '',
  },
  note: {
    type: String,
    default: '',
  },
  attachments: [
    {
      fileName: String,
      fileUrl: String,
      _id: false,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Post = mongoose.model('Post', postSchema);

export default Post;
