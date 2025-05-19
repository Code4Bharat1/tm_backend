import express from 'express';
import { getUserProfile, updateProfile, getUserProfileAdmin, updateProfileAdmin, getAllUsersByCompany } from '../controller/profile.controller.js';
import { protect, protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/getProfile', protect, getUserProfile); // Now protected and uses token
router.put('/updateProfile', protect, updateProfile); // Now protected and uses token
router.get('/getProfileAdmin', protectAdmin, getUserProfileAdmin); // Now protected and uses token
router.put('/updateProfileAdmin', protectAdmin, updateProfileAdmin); // Now protected and uses token
router.get('/getAllUsersByCompany', protectAdmin, getAllUsersByCompany);
export default router;