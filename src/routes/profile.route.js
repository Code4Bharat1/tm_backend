import express from 'express';
import { getUserProfile, updateProfile } from '../controller/profile.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/getProfile', protect, getUserProfile); // Now protected and uses token
router.put('/updateProfile', protect, updateProfile); // Now protected and uses token

export default router;