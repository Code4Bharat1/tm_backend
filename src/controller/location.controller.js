import LocationSetting from '../models/locationSetting.model.js';

export const setLocationSetting = async (req, res) => {
    try {
        const { latitude, longitude, allowedRadius } = req.body;
        const { companyId } = req.user;

        if (!latitude || !longitude || !allowedRadius) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const updated = await LocationSetting.findOneAndUpdate(
            { companyId },
            { latitude, longitude, allowedRadius },
            { new: true, upsert: true }
        );

        res.status(200).json({
            message: 'Location setting saved successfully',
            location: updated
        });
    } catch (error) {
        console.error('Error setting location:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const upsertLocationSetting = async (req, res) => {
    try {
        const { latitude, longitude, allowedRadius } = req.body;
        const { companyId } = req.user;
        if (!companyId || latitude == null || longitude == null || allowedRadius == null) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Since companyId is unique, we upsert: update if exists, otherwise create new
        const updatedSetting = await LocationSetting.findOneAndUpdate(
            { companyId },
            { latitude, longitude, allowedRadius },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            message: 'Location settings saved successfully',
            locationSetting: updatedSetting
        });

    } catch (error) {
        console.error('Error saving location setting:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getLocationSetting = async (req, res) => {
    try {
        const { companyId } = req.user;

        if (!companyId) {
            return res.status(400).json({ message: 'Company ID is required' });
        }

        const locationSetting = await LocationSetting.findOne({ companyId });

        if (!locationSetting) {
            return res.status(404).json({ message: 'Location setting not found for this company' });
        }

        res.status(200).json(locationSetting);
    } catch (error) {
        console.error('Error fetching location setting:', error);
        res.status(500).json({ message: 'Server error while fetching location setting' });
    }
};