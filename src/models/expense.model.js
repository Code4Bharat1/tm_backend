// models/Expense.js
import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyRegistration',
      required: true,
    },
    category: {
      type: String,
      enum: [
        'Travel',
        'Food Expense',
        'Hotel Expense',
        'Misc',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    paymentMethod: {
      type: String,
      enum: [
        'Cash',
        'UPI',
        'Credit Card',
        'Debit Card',
        'Net Banking',
      ],
      required: true,
    },
    description: {
      type: String,
    },
    documents: [
      {
        fileName: String,
        fileUrl: String,
        filePublicId: String,
        fileResourceType: String,
        _id: false,
      },
    ],
  },
  {
    timestamps: true,
  },
);

const Expense = mongoose.model(
  'Expense',
  expenseSchema,
);

export default Expense;
