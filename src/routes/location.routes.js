import express from 'express';
import { setLocationSetting, upsertLocationSetting,getLocationSetting } from '../controller/location.controller.js';
import { protectAdmin} from '../middleware/authMiddleware.js'

const router = express.Router();

router.post('/set-location', protectAdmin , setLocationSetting);
router.put('/update-location', protectAdmin, upsertLocationSetting);
router.get('/get-location', protectAdmin, getLocationSetting)

export default router;