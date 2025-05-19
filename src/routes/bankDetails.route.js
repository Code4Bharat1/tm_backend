import express from 'express';
import { updateUserInfo, getUserInfo } from '../controller/bankDetails.controller.js';
import { protect } from '../middleware/authMiddleware.js';
import multer from 'multer';

const upload = multer();
const router = express.Router();

router.post('/bank/updateUserInfo',protect, upload.single('document'), updateUserInfo);
router.get('/bank/getPersonalInfo',protect, getUserInfo);

export default router;