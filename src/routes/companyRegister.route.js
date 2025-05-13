import express from 'express';
import {
  registerCompany,
  loginCompanyAdmin,
  getAllCompanies,
  deleteCompany
} from '../controller/companyRegistration.controller.js';

const router = express.Router();

router.post('/register', registerCompany);
router.post('/login', loginCompanyAdmin);
router.get('/getAllCompanies', getAllCompanies);
router.delete('/:id', deleteCompany);

export default router;
