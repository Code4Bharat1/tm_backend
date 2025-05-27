// routes/salaryRoutes.js
import express  from 'express';
const   router = express.Router();
import { createSalaryRecord,
  getSalaryRecord,
  getAllSalaryRecords} from '../controller/salaryslip.controller.js';

// Create salary record
router.post('/', createSalaryRecord);

// Get salary record by employee ID
router.get('/:employeeId', getSalaryRecord);

// Get all salary records (admin only)
router.get('/', getAllSalaryRecords);

export default router