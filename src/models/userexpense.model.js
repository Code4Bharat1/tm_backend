import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['Travel', 'Food', 'Hotel', 'Others'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: function () {
      return ['Travel', 'Hotel', 'Others'].includes(this.type);
    },
  },
  file: {
    public_id: String,
    url: String,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
