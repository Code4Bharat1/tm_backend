import mongoose from 'mongoose';

const locationSettingSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CompanyRegistration',
        required: true,
    },
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    allowedRadius: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

locationSettingSchema.index({ companyId: 1 }, { unique: true });

const LocationSetting = mongoose.model('LocationSetting', locationSettingSchema);
export default LocationSetting;
