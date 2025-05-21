import express from 'express';
import { updateUserInfo, getUserInfo,getUsersByCompany } from '../controller/bankDetails.controller.js';
import { protect, protectAdmin } from '../middleware/authMiddleware.js';
import multer from 'multer';

const upload = multer();
const router = express.Router();

router.post('/bank/updateUserInfo',protect, upload.single('document'), updateUserInfo);
router.get('/bank/getPersonalInfo',protect, getUserInfo);
router.get('/bank/getBankDetails',protectAdmin, getUsersByCompany);

export default router;