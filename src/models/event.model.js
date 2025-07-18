import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({ 
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyRegistration',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true
  },
  date: {
    type: Date, 
    required: true
  },
  time: {
    type: String,
    required: true
  },
  game: {
    type: String
  },
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]
}, { timestamps: true });

export default mongoose.model('Event', eventSchema);