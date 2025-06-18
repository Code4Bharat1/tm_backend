import express from 'express';
import {
  registerCompany,
  loginCompanyAdmin,
  getAllCompanies,
  deleteCompany,
  getCompaniesByStatus,
  updateCompanyStatus,
  getCompanyFeatures,
} from '../controller/companyRegistration.controller.js';
import { protectSuperAdmin, protectUserOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerCompany);
router.post('/login', loginCompanyAdmin);
router.get('/getAllCompanies',protectSuperAdmin, getAllCompanies);
router.delete('/:id', protectSuperAdmin, deleteCompany);

router.get('/status', getCompaniesByStatus);      
router.patch('/updateStatus/:id',protectSuperAdmin, updateCompanyStatus); // Update status by ID

router.get('/features', protectUserOrAdmin, getCompanyFeatures);

export default router;
