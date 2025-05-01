import express from 'express';
import { storeTimesheet } from '../controller/timesheet.controller.js';

const router = express.Router();
// Route to store timesheet
router.post('/store', storeTimesheet);

// Route to get timesheet
// router.get('/get', (req, res) => {
//     // Logic to get timesheet
//     res.send('Get timesheet');
// });

export default router;