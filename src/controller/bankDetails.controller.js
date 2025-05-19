import User from "../models/user.model.js";
import { encrypt, decrypt } from '../utils/encryption.js';
import mongoose from 'mongoose';


const updateUserInfo = async (req, res) => {
    try {
        const { userId, companyId } = req.user;
        // Extract these fields from req.body (adjust names to what your form actually sends)
        const {
            accountHolderName,
            accountNumber,
            ifscCode,
            bankName,
            branchName,
            bankDetails: bankDetailsFromBody = [],
            identityDocs = []
        } = req.body;

        // Construct bankDetails array properly:
        // If you want to accept single bank details from form fields, build array from those
        let bankDetails = bankDetailsFromBody;
        if (!Array.isArray(bankDetails) || bankDetails.length === 0) {
            // If no bankDetails array in body, but single bank detail fields exist, build an array
            if (accountHolderName && accountNumber && ifscCode && bankName && branchName) {
                bankDetails = [{
                    accountHolderName,
                    accountNumber,
                    ifscCode,
                    bankName,  // assuming branchNameRight is bankName
                    branchName,
                }];
            } else {
                bankDetails = [];
            }
        }

        if (!Array.isArray(bankDetails)) {
            return res.status(400).json({ message: 'bankDetails must be an array' });
        }
        if (!userId && !companyId) {
            return res.status(400).json({ message: 'UserId or CompanyId is required' });
        }

        const user = await User.findOne({ _id: userId, companyId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate each bank detail
        for (const detail of bankDetails) {
            if (!detail.accountHolderName) {
                return res.status(400).json({ message: 'Account holder name is required for each bank detail' });
            }
            if (!detail.accountNumber) {
                return res.status(400).json({ message: 'Account number is required for each bank detail' });
            }
            if (!detail.ifscCode) {
                return res.status(400).json({ message: 'IFSC code is required for each bank detail' });
            }
            if (!detail.bankName) {
                return res.status(400).json({ message: 'Bank name is required for each bank detail' });
            }
            if (!detail.branchName) {
                return res.status(400).json({ message: 'Branch name is required for each bank detail' });
            }
        }

        // Encrypt and prepare bank details
        const encryptedBankDetails = bankDetails.map(detail => ({
            accountHolderName: encrypt(detail.accountHolderName.trim()),
            accountNumber: encrypt(detail.accountNumber.trim()),
            ifscCode: detail.ifscCode.trim(),
            bankName: detail.bankName.trim(),
            branchName: detail.branchName.trim(),
            isVerified: false, // New bank details are unverified by default
        }));

        // Replace old bankDetails with new ones
        user.bankDetails = encryptedBankDetails;

        // Encrypt and append new identity docs similarly
        if (Array.isArray(identityDocs) && identityDocs.length > 0) {
            const encryptedIdentityDocs = identityDocs.map(doc => ({
                aadhaarNumber: doc.aadhaarNumber ? encrypt(doc.aadhaarNumber.trim()) : undefined,
                panNumber: doc.panNumber ? encrypt(doc.panNumber.trim()) : undefined,
                aadhaarFrontUrl: doc.aadhaarFrontUrl || undefined,
                panCardUrl: doc.panCardUrl || undefined,
            }));
            user.identityDocs.push(...encryptedIdentityDocs);
        }

        await user.save();

        // console.log('User info updated successfully:', user);

        return res.status(200).json({
            message: 'User info updated successfully',
            user: {
                ...user._doc,
                bankDetails: user.bankDetails.map(detail => ({
                    ...detail,
                    accountHolderName: decrypt(detail.accountHolderName),
                    accountNumber: decrypt(detail.accountNumber),
                })),
                identityDocs: user.identityDocs.map(doc => ({
                    ...doc,
                    aadhaarNumber: doc.aadhaarNumber ? decrypt(doc.aadhaarNumber) : undefined,
                    panNumber: doc.panNumber ? decrypt(doc.panNumber) : undefined,
                })),
            },
        });

    } catch (err) {
        console.error('Update error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};



const { ObjectId } = mongoose.Types;
const getUserInfo = async (req, res) => {
    try {
        const { userId, companyId } = req.user;

        if (!userId || !companyId) {
            return res.status(400).json({ message: 'UserId and CompanyId are required' });
        }

        const user = await User.findOne({ _id: userId, companyId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Decrypt sensitive info before sending
        const decryptedBankDetails = user.bankDetails.map(detail => ({
            ...detail.toObject(),
            accountHolderName: decrypt(detail.accountHolderName),
            accountNumber: decrypt(detail.accountNumber),
        }));

        const decryptedIdentityDocs = user.identityDocs.map(doc => ({
            ...doc.toObject(),
            aadhaarNumber: doc.aadhaarNumber ? decrypt(doc.aadhaarNumber) : undefined,
            panNumber: doc.panNumber ? decrypt(doc.panNumber) : undefined,
        }));

        return res.status(200).json({
            message: 'User info fetched successfully',
            user: {
                ...user._doc,
                bankDetails: decryptedBankDetails,
                identityDocs: decryptedIdentityDocs,
            },
        });

    } catch (err) {
        console.error('Get user info error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export { updateUserInfo, getUserInfo };