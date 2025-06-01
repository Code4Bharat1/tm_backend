import Salesman from '../models/salesman.model.js';
import User from '../models/user.model.js';

const findSalesman = async (userId) => {
    const user = await User.findById(userId);
    console.log(user)
    if (!user || user.position !== 'Salesman') return null;

    const salesman = true
    console.log(salesman)
    return salesman;
};

// Punch In
export const punchIn = async (req, res) => {
    try {
        const { userId, companyId } = req.user;
        const {  siteLocation, notes, photo } = req.body;
        console.log(req.body)
        const selfieImage = req.file?.path || null;

        const salesman = await findSalesman(userId);
        console.log(salesman)
        if (salesman) {
            const newVisit = new Salesman({
                userId,
                companyId,
                siteLocation,
                notes,
                punchIn: new Date(),
                punchInPhoto: photo,
            });
            console.log(newVisit)
            await newVisit.save();
        }

        if (!salesman) return res.status(403).json({ error: 'User is not a Salesman or not found' });

        salesman.visits.push({
            userId,
            companyId,
            siteLocation,
            notes,
            punchIn: new Date(),
            punchInPhoto: photoPath,
        });

        await salesman.save();
        res.status(200).json({ message: 'Punch-in recorded successfully', salesman });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// Punch Out
export const punchOut = async (req, res) => {
    try {
        const userId = req.user.userId;
        const photoPath = req.file?.path || null;

        const salesman = await findSalesman(userId);
        if (!salesman) return res.status(403).json({ error: 'User is not a Salesman or not found' });

        const lastVisit = [...salesman.visits].reverse().find(visit => !visit.punchOut);
        if (!lastVisit) return res.status(400).json({ error: 'No open punch-in found' });

        lastVisit.punchOut = new Date();
        lastVisit.punchOutPhoto = photoPath;

        await salesman.save();
        res.status(200).json({ message: 'Punch-out recorded successfully', salesman });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// Get all visits
export const getVisits = async (req, res) => {
    try {
        const salesmanId = req.user.userId;

        const salesman = await Salesman.findById(salesmanId).select('name visits');
        if (!salesman) return res.status(404).json({ error: 'Salesman not found' });

        const visitsFormatted = salesman.visits.map(visit => ({
            punchIn: visit.punchIn,
            punchOut: visit.punchOut,
            punchInPhoto: visit.punchInPhoto,
            punchOutPhoto: visit.punchOutPhoto,
            siteLocation: visit.siteLocation,
            notes: visit.notes,
            companyId: visit.companyId,
            userId: visit.userId,
        }));

        res.status(200).json({
            name: salesman.name,
            visits: visitsFormatted
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};
