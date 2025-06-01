import mongoose from 'mongoose';



const salesmanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CompanyRegistration',
        required: true,
        index: true,
    },
    punchIn: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
    },
    punchInPhoto: {
        type: String, // Store photo URL or file path
        default: null,
    },
    punchOut: {
        type: Date,
        default: null,
        index: true,
    },
    punchOutPhoto: {
        type: String,
        default: null,
    },
    siteLocation: {
        latitude: {
            type: Number,
            required: true,
        },
        longitude: {
            type: Number,
            required: true,
        }
    },
    notes: {
        type: String,
        default: null,
    },
}, {
    timestamps: true,
});

const Salesman = mongoose.model('Salesman', salesmanSchema);

export default Salesman;
