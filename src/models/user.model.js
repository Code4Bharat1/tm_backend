// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';



const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        unique: true,
        required: true
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
        default: null
    },
    otp: {
        type: String,
    },
    expiresAt: {
        type: Date,
    },
    photoUrl:{
        type: String,
    },

    // 👇 Bank Details Array
    bankDetails: [{
        accountHolderName: { type: String, required: true },
        accountNumber: { type: String, required: true }, // encrypt in logic
        ifscCode: { type: String, required: true },
        bankName: { type: String }
    }],

    // 👇 Identity Documents Array
    identityDocs: [{
        aadhaarNumber: { type: String }, // encrypt
        panNumber: { type: String },     // encrypt
        aadhaarFrontUrl: { type: String },
        panCardUrl: { type: String }
    }]

}, { timestamps: true });



// Generate unique userId before saving
userSchema.pre('validate', async function (next) {
    if (this.isNew || this.isModified('companyName')) {
        let unique = false;
        while (!unique) {
            const prefix = this.companyName.substring(0, 3).toUpperCase();
            const randomDigits = Math.floor(100000 + Math.random() * 900000);
            const generatedId = `${prefix}${randomDigits}`;

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
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to match password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
