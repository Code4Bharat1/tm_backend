import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

// Bank sub-schema
const bankDetailsSchema = new mongoose.Schema({
    accountHolderName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },
    bankName: { type: String, required: true },
    branchName: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
}, { _id: false });

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        unique: true,
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CompanyRegistration',
        required: true,
    },
    companyName: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    position: {
        type: String,
        default: "Employee"  // fixed typo
    },
    gender: {
        type: String,
        default: null
    },
    dateOfJoining: {
        type: String,
        default: null
    },
    address: {
        type: String,
        default: null
    },
    otp: {
        type: String,
    },
    expiresAt: {
        type: Date,
    },
    photoUrl: {
        type: String,
    },

    bankDetails: [bankDetailsSchema],

    identityDocs: [{
        aadhaarNumber: { type: String }, // encrypted externally
        panNumber: { type: String },     // encrypted externally
        aadhaarFrontUrl: { type: String },
        panCardUrl: { type: String }
    }]

}, { timestamps: true });

// Generate unique userId before validating (so required userId is set)
userSchema.pre('validate', async function (next) {
    if (this.isNew || this.isModified('companyName')) {
        let unique = false;
        while (!unique) {
            const prefix = this.companyName.substring(0, 3).toUpperCase();
            const randomDigits = Math.floor(100000 + Math.random() * 900000);
            const generatedId = `${prefix}${randomDigits}`;  // fixed template literal

            const existing = await mongoose.models.User.findOne({ userId: generatedId });
            if (!existing) {
                this.userId = generatedId;
                unique = true;
            }
        }
    }
    next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
