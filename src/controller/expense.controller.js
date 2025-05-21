import Expense from '../models/expense.model.js';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
/**
 * Create a new expense entry
 */
// export const createExpense = async (req, res) => {
//   try {
//     const { expenses } = req.body;
//     const { userId, companyId } = req.user;

//     const newExpenses = expenses.map((exp) => ({
//       userId,
//       companyId,
//       category: exp.category,
//       amount: exp.amount,
//       date: exp.date,
//       paymentMethod: exp.paymentMethod,
//       description: exp.description || '',
//       documents: exp.documents?.map(doc => ({
//         fileName: doc.fileName,
//         fileUrl: doc.fileUrl,
//         filePublicId: doc.filePublicId,
//         fileResourceType: doc.fileResourceType // Explicitly map this field
//       })) || []
//     }));

//     const savedExpenses = await Expense.insertMany(newExpenses);

//     res.status(201).json({
//       message: 'Expenses created successfully',
//       data: savedExpenses
//     });
//   } catch (error) {
//     console.error('Error creating expense:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };
export const createExpense = async (req, res) => {
  try {
    const { expenses } = req.body;
    const { userId, companyId } = req.user;

    const newExpenses = expenses.map((exp) => ({
      userId,
      companyId,
      category: exp.category,
      amount: exp.amount,
      date: exp.date,
      paymentMethod: exp.paymentMethod,
      description: exp.description || '',
      documents:
        exp.documents?.map((doc) => ({
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          filePublicId: doc.filePublicId,
          fileResourceType: doc.fileResourceType, // Explicitly map this field
        })) || [],
        
    }
  ));

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

export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: 'Invalid expense ID' });
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      return res
        .status(404)
        .json({ message: 'Expense not found' });
    }

    // 🔄 Loop through all attached documents and delete from Cloudinary
    for (const doc of expense.documents || []) {
      if (doc.filePublicId) {
        try {
          const result =
            await cloudinary.uploader.destroy(
              doc.filePublicId,
              {
                resource_type:
                  doc.fileResourceType || 'image', // handles images, PDFs, etc.
              },
            );

          console.log(
            `Deleted Cloudinary file ${doc.filePublicId}:`,
            result,
          );

          if (result.result !== 'ok') {
            console.warn(
              `Cloudinary deletion failed for ${doc.filePublicId}:`,
              result,
            );
          }
        } catch (cloudErr) {
          console.error(
            `Error deleting file ${doc.filePublicId} from Cloudinary:`,
            cloudErr,
          );
        }
      }
    }

    // ❌ Delete the expense from MongoDB
    await Expense.findByIdAndDelete(id);

    res.status(200).json({
      message:
        'Expense and associated files deleted successfully',
      data: { id: expense._id },
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
