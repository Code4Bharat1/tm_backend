import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  date: {
    type: String, 
    required: true
  },
  time:{
    type:String,
    required:true
  },
  games: [{
    type: String
  }]
}, { timestamps: true });

export default mongoose.model('Event', eventSchema);