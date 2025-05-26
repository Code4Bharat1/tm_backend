import express from 'express';
import { protect, protectAdmin } from '../middleware/authMiddleware.js';
import { updateUserFeaturesByRoleAccess, getUsersFeaturesByCompany, getUsersFeatures } from '../controller/permissions.controller.js';

const router = express.Router();

router.put('/update-permissions',protectAdmin, updateUserFeaturesByRoleAccess);
router.get('/user-features',protectAdmin ,getUsersFeaturesByCompany);
router.get('/user/features', protect, getUsersFeatures)

export default router;
