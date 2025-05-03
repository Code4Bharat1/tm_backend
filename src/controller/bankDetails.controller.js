import User from "../models/user.model.js";
import { encrypt, decrypt } from '../utils/encryption.js';

const updateUserInfo = async (req, res) => {
    try {
        const { email, phoneNumber, bankDetails = [], identityDocs = [] } = req.body;

        // Validate input
        if (!email && !phoneNumber) {
            return res.status(400).json({ message: 'Email or phone number is required' });
        }

        // Find user by email or phone number
        const user = await User.findOne({ $or: [{ email }, { phoneNumber }] });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Encrypt and append new bank details
        if (Array.isArray(bankDetails) && bankDetails.length > 0) {
            const encryptedBankDetails = bankDetails
                .map(detail => {
                    // Ensure accountHolderName is present
                    if (!detail.accountHolderName) {
                        return res.status(400).json({ message: 'Account holder name is required for each bank detail' });
                    }

                    return {
                        ...detail,
                        accountHolderName: encrypt(detail.accountHolderName.trim()), // Encrypt accountHolderName
                        accountNumber: typeof detail.accountNumber === 'string' && detail.accountNumber.trim()
                            ? encrypt(detail.accountNumber.trim()) // Encrypt accountNumber
                            : undefined,
                    };
                });

            // Only push valid bank details to the user's bankDetails array
            user.bankDetails.push(...encryptedBankDetails);
        }

        // Encrypt and append new identity documents
        if (Array.isArray(identityDocs) && identityDocs.length > 0) {
            const encryptedIdentityDocs = identityDocs.map(doc => ({
                ...doc,
                aadhaarNumber: typeof doc.aadhaarNumber === 'string' && doc.aadhaarNumber.trim()
                    ? encrypt(doc.aadhaarNumber.trim())
                    : undefined,
                panNumber: typeof doc.panNumber === 'string' && doc.panNumber.trim()
                    ? encrypt(doc.panNumber.trim())
                    : undefined
            }));
            user.identityDocs.push(...encryptedIdentityDocs);
        }

        // Save updated user info
        await user.save();
        res.status(200).json({ message: 'User info updated successfully' });
    } catch (err) {
        console.error('Update error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getUserInfo = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Decrypt sensitive fields
        const decryptedBankDetails = user.bankDetails.map(detail => ({
            ...detail,
            accountNumber: decrypt(detail.accountNumber)
        }));

        const decryptedIdentityDocs = user.identityDocs.map(doc => ({
            ...doc,
            aadhaarNumber: doc.aadhaarNumber ? decrypt(doc.aadhaarNumber) : undefined,
            panNumber: doc.panNumber ? decrypt(doc.panNumber) : undefined
        }));

        res.status(200).json({
            ...user.toObject(),
            bankDetails: decryptedBankDetails,
            identityDocs: decryptedIdentityDocs
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export { updateUserInfo, getUserInfo };
