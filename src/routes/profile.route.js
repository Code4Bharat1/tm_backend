import express from 'express';
import multer from 'multer';
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
const upload = multer({ storage: multer.memoryStorage() });

// User routes
router.get(
  '/getProfile',
  protect,
  getUserProfile,
);
router.put( 
  '/updateProfile',
  protect,
  upload.single('photo'),
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
  upload.single('photo'),
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
