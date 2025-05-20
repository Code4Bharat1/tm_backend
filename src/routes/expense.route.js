// Update the routes file to include the new update endpoint

import express from 'express';
import {
  approveExpense,
  createExpense,
  deleteExpense,
  getCompanyExpenses,
  getUserExpenses,
  rejectExpense,
} from '../controller/expense.controller.js';
import {
  protect,
  protectAdmin,
} from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/createExpense',
  protect,
  createExpense,
);
router.get(
  '/getExpense',
  protect,
  getUserExpenses,
);
router.get(
  '/getAllExpense',
  protectAdmin,
  getCompanyExpenses,
);
router.patch(
  '/:id/approve',
  protectAdmin,
  approveExpense,
);
router.patch(
  '/:id/reject',
  protectAdmin,
  rejectExpense,
);
// New route for updating an expense
// router.patch(
//   '/:id/update',
//   protect,
//   updateExpense,
// );
router.delete(
  '/:id/delete',
  protectAdmin,
  deleteExpense,
);

export default router;
