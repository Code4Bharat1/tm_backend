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
      required: true,
      default: 'test@123'
    }
  },
  officeLocation: {
    type: String,
  },
  attendanceSettings: {
    workingDays: {
      type: [String], // e.g., ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    },
    punchInEndTime: {
      type: String, // e.g., '09:00'
      default: '09:00'
    },
    punchOutEndTime: {
      type: String, // e.g., '17:00'
      default: '17:00'
    }
  },
  planPreferences: {
    desiredPlan: {
      type: String,
      enum: ['Basic','Standard', 'Premium'],
      default: 'Basic'
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
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Rejected'],
    default: 'Pending'
  }

}, { timestamps: true });

// Hash admin password before saving
companyRegistrationSchema.pre('save', async function (next) {
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
companyRegistrationSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.adminInfo.password);
};

// Avoid model overwrite on hot reload
export const CompanyRegistration = mongoose.models.CompanyRegistration || mongoose.model('CompanyRegistration', companyRegistrationSchema);
