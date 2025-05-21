import express from 'express';
import {
  registerCompany,
  loginCompanyAdmin,
  getAllCompanies,
  deleteCompany,
  getCompaniesByStatus,
  updateCompanyStatus,
} from '../controller/companyRegistration.controller.js';
import { protectSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerCompany);
router.post('/login', loginCompanyAdmin);
router.get('/getAllCompanies',protectSuperAdmin, getAllCompanies);
router.delete('/:id', protectSuperAdmin, deleteCompany);

router.get('/status', getCompaniesByStatus);      // ?status=Pending
router.patch('/updateStatus/:id',protectSuperAdmin, updateCompanyStatus); // Update status by ID

export default router;
