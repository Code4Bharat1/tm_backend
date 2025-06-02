import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema({
  punchInLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  punchOutLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  notes: { type: String, default: null },
  punchIn: { type: Date, required: true },
  punchInPhoto: { type: String, default: null },
  punchOut: { type: Date, default: null },
  punchOutPhoto: { type: String, default: null },
});

// ✅ Virtual field to calculate duration between punch in & punch out
visitSchema.virtual('duration').get(function () {
  if (this.punchIn && this.punchOut) {
    const diffMs = new Date(this.punchOut) - new Date(this.punchIn);
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  return null;
});

const salesmanVisitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyRegistration',
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    default: () => new Date().setHours(0, 0, 0, 0),
  },
  visits: [visitSchema],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ Add compound indexes for optimized queries
salesmanVisitSchema.index({ userId: 1, date: 1 });
salesmanVisitSchema.index({ companyId: 1, date: 1 });

export default mongoose.model('SalesmanVisit', salesmanVisitSchema);
