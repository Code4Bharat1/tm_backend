import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const companyRegistrationSchema = new mongoose.Schema({
  companyInfo: {
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    websiteURL: {
      type: String,
      trim: true
    },
    companyEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    }
  },

  adminInfo: {
    fullName: {
      type: String,
      trim: true
    },
    officialEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    designation: {
      type: String,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      required: true
    }
  },

  planPreferences: {
    desiredPlan: {
      type: String,
      enum: ['Free', 'Basic', 'Premium'],
      default: 'Free'
    },
    expectedStartDate: Date,
    numberOfExpectedUsers: {
      type: Number,
      default: 1
    }
  },

  termsAccepted: {
    type: Boolean,
    required: true
  }

}, { timestamps: true });

// Hash admin password before saving
companyRegistrationSchema.pre('save', async function(next) {
  if (!this.isModified('adminInfo.password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.adminInfo.password = await bcrypt.hash(this.adminInfo.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method for login (if needed)
companyRegistrationSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.adminInfo.password);
};

// Avoid model overwrite on hot reload
export const CompanyRegistration = mongoose.models.CompanyRegistration || mongoose.model('CompanyRegistration', companyRegistrationSchema);
