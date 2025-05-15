import express from 'express';
import {
  registerCompany,
  loginCompanyAdmin,
  getAllCompanies,
  deleteCompany,
  getCompaniesByStatus,
  updateCompanyStatus,
} from '../controller/companyRegistration.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerCompany);
router.post('/login', loginCompanyAdmin);
router.get('/getAllCompanies',protect, getAllCompanies);
router.delete('/:id', protect, deleteCompany);

router.get('/status', getCompaniesByStatus);      // ?status=Pending
router.patch('/updateStatus/:id', updateCompanyStatus); // Update status by ID

export default router;
