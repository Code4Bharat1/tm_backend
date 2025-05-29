import mongoose from "mongoose";
import bcrypt from "bcrypt";

const clientSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CompanyRegistration',
            required: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            match: [/.+@.+\..+/, 'Please enter a valid email'],
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false, // prevents it from being returned in queries
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        country: {
            type: String,
            required: true,
            trim: true,
        },
        projectId: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Project',
                required: true,
            }
        ],
        createdAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// 🔐 Pre-save middleware to hash password
clientSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const saltRounds = 10;
        this.password = await bcrypt.hash(this.password, saltRounds);
        next();
    } catch (err) {
        next(err);
    }
});

// 🔍 Instance method to compare password
clientSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// 🧠 Optional: compound index
clientSchema.index({ companyId: 1, email: 1 });

const Client = mongoose.model('Client', clientSchema);
export default Client;
