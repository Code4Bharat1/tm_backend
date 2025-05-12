import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const superAdminSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  permission: {
    type: [String],
    default: ['all']
  },
  isRoot: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Hash password before saving
superAdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
superAdminSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Use named export to avoid model overwrite in hot reload
export const SuperAdmin = mongoose.models.SuperAdmin || mongoose.model('SuperAdmin', superAdminSchema);
