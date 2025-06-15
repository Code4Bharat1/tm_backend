import mongoose from 'mongoose';

const reportLogSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyRegistration',
    required: true
  },
  sentTo: {
    type: String,
    required: true
  },
  fileName: {
    type: String
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Sent', 'Failed'],
    default: 'Sent'
  },
  errorMessage: {
    type: String,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('ReportLog', reportLogSchema);