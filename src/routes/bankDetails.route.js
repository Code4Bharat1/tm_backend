import express from 'express';
import { updateUserInfo, getUserInfo } from '../controller/bankDetails.controller.js';

const router = express.Router();

router.post('/updateUserInfo', updateUserInfo);
router.get('/getUserInfo/:userId', getUserInfo);

export default router;