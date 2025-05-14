import express from 'express';
import {
  registerCompany,
  loginCompanyAdmin,
  getAllCompanies,
  deleteCompany
} from '../controller/companyRegistration.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerCompany);
router.post('/login', loginCompanyAdmin);
router.get('/getAllCompanies',protect, getAllCompanies);
router.delete('/:id', protect, deleteCompany);

export default router;
