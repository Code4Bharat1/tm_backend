import express from 'express';
import { getUserProfile, updateProfile, getUserProfileAdmin, updateProfileAdmin, getAllUsersByCompany } from '../controller/profile.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/getProfile', protect, getUserProfile); // Now protected and uses token
router.put('/updateProfile', protect, updateProfile); // Now protected and uses token
router.get('/getProfileAdmin', protect, getUserProfileAdmin); // Now protected and uses token
router.put('/updateProfileAdmin', protect, updateProfileAdmin); // Now protected and uses token
router.get('/getAllUsersByCompany', protect, getAllUsersByCompany);
export default router;