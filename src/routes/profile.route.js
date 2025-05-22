import express from 'express';
import {
  getUserProfile,
  updateProfile,
  removeUserPhoto,
  getUserProfileAdmin,
  updateProfileAdmin,
  removeAdminPhoto,
  getAllUsersByCompany,
} from '../controller/profile.controller.js';
import {
  protect,
  protectAdmin,
} from '../middleware/authMiddleware.js';

const router = express.Router();

// User routes
router.get(
  '/getProfile',
  protect,
  getUserProfile,
);
router.put(
  '/updateProfile',
  protect,
  updateProfile,
);
router.delete(
  '/removePhoto',
  protect,
  removeUserPhoto,
);

// Admin routes
router.get(
  '/getProfileAdmin',
  protectAdmin,
  getUserProfileAdmin,
);
router.put(
  '/updateProfileAdmin',
  protectAdmin,
  updateProfileAdmin,
);
router.delete(
  '/removePhotoAdmin',
  protectAdmin,
  removeAdminPhoto,
);

// Company routes
router.get(
  '/getAllUsersByCompany',
  protectAdmin,
  getAllUsersByCompany,
);

export default router;
