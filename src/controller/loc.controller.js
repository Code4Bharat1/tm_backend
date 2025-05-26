import LetterOfConfirmation from '../models/loc.model.js';
import User from '../models/user.model.js';
// import { generatePDF } from '../services/pdf.service.js'; // You'll need to implement this

export const createLetter = async (req, res) => {
    try {
        const authUser = req.user;
        
        // Get user with company details
        const user = await User.findById(authUser.userId)
            .populate('companyId')
            .select('firstName lastName email position dateOfJoining companyId');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (!user.companyId) {
            return res.status(400).json({ message: 'User is not associated with any company' });
        }

        // Check if company data is properly populated
        if (!user.companyId.companyName) {
            console.error('Company data:', user.companyId);
            return res.status(400).json({ message: 'Company information is incomplete' });
        }

        // Destructure request body
        const {
            designation,
            department,
            employmentType,
            reportingManager,
            workLocation,
            performanceRating,
            performanceStatus,
            reviewDate,
            additionalNotes,
            contactForVerification
        } = req.body;

        // Validate performance rating
        if (performanceRating && (performanceRating < 0 || performanceRating > 10)) {
            return res.status(400).json({ message: 'Performance rating must be between 0 and 10' });
        }

        // Generate reference number with error handling
        const refNumber = await generateReferenceNumber(user.companyId.companyName);

        // Prepare letter data
        const letterData = {
            // User information (automatic)
            userId: user._id,
            companyId: user.companyId._id,
            companyName: user.companyId.companyName,
            issuedBy: authUser.userId,
            status: 'Issued',
            fullName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            position: user.position,
            dateOfJoining: user.dateOfJoining,
            
            // From request body
            designation,
            department,
            employmentType,
            reportingManager,
            workLocation,
            performanceRating,
            performanceStatus,
            reviewDate: reviewDate ? new Date(reviewDate) : null,
            additionalNotes,
            contactForVerification,
            
            // System generated
            refNumber,
            issuedDate: new Date()
        };

        const letter = new LetterOfConfirmation(letterData);
        await letter.save();

        // Generate PDF
        const pdfBuffer = await generatePDF(letter);

        res.status(201).json({
            message: 'Letter created successfully',
            letter: {
                ...letter.toObject(),
                pdfUrl: `/letters/${letter._id}/download`
            }
        });

    } catch (error) {
        console.error('Letter creation error:', error);
        res.status(500).json({ 
            message: 'Error creating letter',
            error: error.message 
        });
    }
};

// Helper function to generate reference number with better error handling
async function generateReferenceNumber(companyName) {
    try {
        // Provide fallback if companyName is still undefined
        if (!companyName || typeof companyName !== 'string') {
            console.warn('Company name is invalid, using default prefix');
            companyName = 'DEFAULT';
        }
        
        const prefix = companyName.substring(0, 3).toUpperCase();
        const year = new Date().getFullYear();
        const randomDigits = Math.floor(100 + Math.random() * 900);
        return `LOC/${prefix}/${year}/${randomDigits}`;
    } catch (error) {
        console.error('Error generating reference number:', error);
        // Fallback reference number
        const year = new Date().getFullYear();
        const randomDigits = Math.floor(100 + Math.random() * 900);
        return `LOC/DEF/${year}/${randomDigits}`;
    }
}

export const getLetterById = async (req, res) => {
    try {
        const letter = await LetterOfConfirmation.findById(req.params.id)
            .populate('userId', 'firstName lastName email position')
            .populate('companyId', 'companyName address')
            .populate('issuedBy', 'firstName lastName');

        if (!letter) {
            return res.status(404).json({ message: 'Letter not found' });
        }

        res.status(200).json(letter);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateLetter = async (req, res) => {
    try {
        const letter = await LetterOfConfirmation.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).populate('userId', 'firstName lastName email position');

        if (!letter) {
            return res.status(404).json({ message: 'Letter not found' });
        }

        res.status(200).json(letter);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteLetter = async (req, res) => {
    try {
        const letter = await LetterOfConfirmation.findByIdAndDelete(req.params.id);

        if (!letter) {
            return res.status(404).json({ message: 'Letter not found' });
        }

        res.status(200).json({ message: 'Letter deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserLetters = async (req, res) => {
    try {
        const letters = await LetterOfConfirmation.find({ userId: req.params.userId })
            .sort({ issuedDate: -1 })
            .populate('issuedBy', 'firstName lastName');

        res.status(200).json(letters);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const downloadLetterPDF = async (req, res) => {
    try {
        const letter = await LetterOfConfirmation.findById(req.params.id)
            .populate('userId', 'firstName lastName email position')
            .populate('companyId', 'companyName address');

        if (!letter) {
            return res.status(404).json({ message: 'Letter not found' });
        }

        // Generate PDF (implementation depends on your PDF service)
        const pdfBuffer = await generatePDF(letter);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=LOC_${letter.refNumber}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};