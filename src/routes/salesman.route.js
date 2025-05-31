import express from 'express';
import {
    punchIn,
    punchOut,
    getVisits
} from '../controller/salesman.controller.js';
import {protect} from '../middleware/authMiddleware.js'
import multer from 'multer';

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) =>
        cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

const router = express.Router();

router.post('/salesman/punch-in', protect ,upload.single('photo'),punchIn);
router.post('/salesman/punch-out',protect,upload.single('photo'), punchOut);
router.get('/salesman/visits',protect, getVisits);

export default router;
