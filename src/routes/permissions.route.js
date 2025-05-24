import express from 'express';
import { protectAdmin } from '../middleware/authMiddleware.js';
import { updateUserFeaturesByRoleAccess, getUsersFeaturesByCompany } from '../controller/permissions.controller.js';

const router = express.Router();

router.put('/update-permissions',protectAdmin, updateUserFeaturesByRoleAccess);
router.get('/user-features',protectAdmin ,getUsersFeaturesByCompany);

export default router;
