// routes/salaryRoutes.js
import express from 'express';
const router = express.Router();
import {
  createSalaryRecord,
  updateSalaryRecord,
  getSalaryRecord,
  getAllSalaryRecords,
  deleteSalaryRecord,
  getSalaryStatistics
} from '../controller/salaryslip.controller.js';

// Get salary statistics (should be before /:employeeId to avoid conflicts)
router.get('/statistics', getSalaryStatistics);

// Get all salary records (admin only) - with query parameters for filtering
router.get('/', getAllSalaryRecords);

// Create salary record
router.post('/', createSalaryRecord);

// Get salary record by employee ID
router.get('/:employeeId', getSalaryRecord);

// Update salary record by employee ID
router.put('/:employeeId', updateSalaryRecord);

// Delete salary record by employee ID
router.delete('/:employeeId', deleteSalaryRecord);

export default router;