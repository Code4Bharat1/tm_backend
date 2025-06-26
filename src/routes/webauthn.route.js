import express from 'express';
import {
    generateRegistrationOptionsController,
    verifyRegistrationController,
    generateAuthenticationOptionsController,
    verifyAuthenticationController,
} from '../controller/webauthn.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 🔐 2FA Registration (Step 1)
router.post('/generate-registration-options', protect, generateRegistrationOptionsController);

// ✅ 2FA Registration (Step 2)
router.post('/verify-registration', protect, verifyRegistrationController);

// 🔐 2FA Authentication (Step 1)
router.post('/generate-authentication-options',generateAuthenticationOptionsController);

// ✅ 2FA Authentication (Step 2)
router.post('/verify-authentication', protect, verifyAuthenticationController);

export default router;
