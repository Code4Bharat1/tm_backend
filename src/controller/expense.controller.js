// Update the expense controller with new functionality for updating expenses

import Expense from '../models/expense.model.js';
import mongoose from 'mongoose';

/**
 * Create a new expense entry
 */
export const createExpense = async (req, res) => {
  try {
    const { expenses } = req.body;

    if (
      !Array.isArray(expenses) ||
      expenses.length === 0
    ) {
      return res.status(400).json({
        message: 'No expense data provided',
      });
    }

    const { userId, companyId } = req.user;

    const newExpenses = expenses.map((exp) => ({
      userId,
      companyId,
      category: exp.category,
      amount: exp.amount,
      date: exp.date,
      paymentMethod: exp.paymentMethod,
      description: exp.description || '',
      documents: exp.documents || [], // expects [{ fileName, fileUrl }]
    }));

    const savedExpenses =
      await Expense.insertMany(newExpenses);

    res.status(201).json({
      message: 'Expenses created successfully',
      data: savedExpenses,
    });
  } catch (error) {
    console.error(
      'Error creating expense:',
      error,
    );
    res
      .status(500)
      .json({ message: 'Internal server error' });
  }
};

/**
 * Update an existing expense
 */
// export const updateExpense = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { userId } = req.user;
//     const {
//       category,
//       amount,
//       date,
//       paymentMethod,
//       description,
//     } = req.body;

//     // Validate the expense ID
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res
//         .status(400)
//         .json({ message: 'Invalid expense ID' });
//     }

//     // Find the expense first to check if it belongs to the user
//     const expense = await Expense.findById(id);

//     if (!expense) {
//       return res
//         .status(404)
//         .json({ message: 'Expense not found' });
//     }

//     // Check if the expense belongs to the user
//     if (
//       String(expense.userId) !== String(userId)
//     ) {
//       return res.status(403).json({
//         message:
//           'Not authorized to update this expense',
//       });
//     }

//     // Check if the expense is in a pending state (only pending expenses can be updated)
//     if (expense.status !== 'pending') {
//       return res.status(400).json({
//         message:
//           'Only pending expenses can be updated',
//       });
//     }

//     // Update the expense
//     const updatedExpense =
//       await Expense.findByIdAndUpdate(
//         id,
//         {
//           category,
//           amount,
//           date,
//           status: 'Pending',
//           paymentMethod,
//           description,
//         },
//         { new: true },
//       );

//     res.status(200).json({
//       message: 'Expense updated successfully',
//       data: updatedExpense,
//     });
//   } catch (error) {
//     console.error(
//       'Error updating expense:',
//       error,
//     );
//     res
//       .status(500)
//       .json({ message: 'Internal server error' });
//   }
// };

export const approveExpense = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    const updated =
      await Expense.findByIdAndUpdate(
        id,
        {
          status: 'approved',
          rejectionReason: '',
        },
        { new: true },
      );

    if (!updated)
      return res
        .status(404)
        .json({ message: 'Expense not found' });

    res.status(200).json({
      message: 'Expense approved',
      data: updated,
    });
  } catch (err) {
    console.error(
      'Error approving expense:',
      err,
    );
    res
      .status(500)
      .json({ message: 'Internal server error' });
  }
};

export const rejectExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (
      !rejectionReason ||
      !rejectionReason.trim()
    ) {
      return res.status(400).json({
        message: 'Rejection reason is required',
      });
    }

    const updated =
      await Expense.findByIdAndUpdate(
        id,
        { status: 'rejected', rejectionReason },
        { new: true },
      );

    if (!updated)
      return res
        .status(404)
        .json({ message: 'Expense not found' });

    res.status(200).json({
      message: 'Expense rejected',
      data: updated,
    });
  } catch (err) {
    console.error(
      'Error rejecting expense:',
      err,
    );
    res
      .status(500)
      .json({ message: 'Internal server error' });
  }
};

/**
 * Delete an expense entry
 */
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the expense ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: 'Invalid expense ID' });
    }

    const deleted =
      await Expense.findByIdAndDelete(id);

    if (!deleted) {
      return res
        .status(404)
        .json({ message: 'Expense not found' });
    }

    res.status(200).json({
      message: 'Expense deleted successfully',
      data: { id: deleted._id },
    });
  } catch (error) {
    console.error(
      'Error deleting expense:',
      error,
    );
    res
      .status(500)
      .json({ message: 'Internal server error' });
  }
};

export const getUserExpenses = async (
  req,
  res,
) => {
  try {
    const { userId, companyId } = req.user;

    const expenses = await Expense.find({
      userId,
      companyId,
    }).sort({ date: -1 });

    res.status(200).json({ data: expenses });
  } catch (error) {
    console.error(
      'Error fetching user expenses:',
      error,
    );
    res
      .status(500)
      .json({ message: 'Internal server error' });
  }
};

export const getCompanyExpenses = async (
  req,
  res,
) => {
  try {
    const { companyId } = req.user;

    const expenses = await Expense.find({
      companyId,
    })
      .sort({ date: -1 })
      .populate(
        'userId',
        'firstName lastName email',
      ); // Populate user details

    res.status(200).json({ data: expenses });
  } catch (error) {
    console.error(
      'Error fetching company expenses:',
      error,
    );
    res
      .status(500)
      .json({ message: 'Internal server error' });
  }
};
