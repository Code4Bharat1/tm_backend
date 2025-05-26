import mongoose from 'mongoose';

const letterOfConfirmationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CompanyRegistration',
        required: true
    },
    companyName: {
        type: String,
        required: true
    },
    employeeId: {
        type: String,
        required: true
    },
    refNumber: {
        type: String,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    designation: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    dateOfJoining: {
        type: Date,
        required: true
    },
    employmentType: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Intern'],
        default: 'Full-time'
    },
    reportingManager: {
        type: String,
        required: true
    },
    workLocation: {
        type: String,
        required: true
    },
    performanceRating: {
        type: Number,
        min: 0,
        max: 10
    },
    performanceStatus: {
        type: String,
        enum: ['Exceeds Expectations', 'Meets Expectations', 'Below Expectations', 'PIP'],
        default: 'Meets Expectations'
    },
    reviewDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['Draft', 'Issued', 'Archived'],
        default: 'Draft'
    },
    issuedDate: {
        type: Date,
        default: Date.now
    },
    additionalNotes: {
        type: String
    },
    contactForVerification: {
        phone: String,
        email: String
    },
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    templateVersion: {
        type: String,
        default: '1.0'
    }
}, { timestamps: true });

// Generate reference number before saving
letterOfConfirmationSchema.pre('save', function(next) {
    if (!this.refNumber) {
        const prefix = 'NA/LOC/';
        const year = new Date().getFullYear();
        const randomDigits = Math.floor(100 + Math.random() * 900);
        this.refNumber = `${prefix}${year}/${randomDigits}`;
    }
    next();
});

const LetterOfConfirmation = mongoose.model('LetterOfConfirmation', letterOfConfirmationSchema);

export default LetterOfConfirmation;