import mongoose from 'mongoose';

const addDocumentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyRegistration',
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    documentName: {
      type: String,
      required: true,
      trim: true,
    },
    documentFileUrl: {
      // This should match the controller
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const AddDocument = mongoose.model('AddDocument', addDocumentSchema);
