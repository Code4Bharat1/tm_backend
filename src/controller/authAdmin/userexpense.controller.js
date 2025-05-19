import multer from 'multer';
import { Expense } from '../../models/userexpense.model.js';
import { uploadToCloudinary } from '../../utils/cloudinary.js';
import Admin from '../../models/admin.model.js'; // Admin model import

// In-memory multer storage
const storage = multer.memoryStorage();
const upload = multer({ storage }).array('files');

// POST: /api/expenses/submit
const submitExpenses = (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: 'File parsing failed', error: err.message });
    }

    try {
      const userId = req.user.userId;
      const { types, descriptions, dates, times } = req.body;

      const files = req.files || [];

      const normalizeToArray = (input) => (Array.isArray(input) ? input : [input]);

      const expenseTypes = normalizeToArray(types);
      const expenseDescriptions = normalizeToArray(descriptions);
      const expenseDates = normalizeToArray(dates);
      const expenseTimes = normalizeToArray(times);

      const expensesToInsert = [];

      for (let i = 0; i < expenseTypes.length; i++) {
        let cloudinaryFileData = null;

        if (files[i]) {
          const result = await uploadToCloudinary(files[i].buffer, 'user_expenses');
          cloudinaryFileData = {
            public_id: result.public_id,
            url: result.secure_url,
          };
        }

        const expense = {
          userId,
          type: expenseTypes[i],
          description: expenseDescriptions[i],
          date: new Date(expenseDates[i]),
          time: expenseTimes?.[i] || null,
          file: cloudinaryFileData,
        };

        expensesToInsert.push(expense);
      }

      const savedExpenses = await Expense.insertMany(expensesToInsert);

      res.status(201).json({
        message: 'Expenses submitted successfully',
        data: savedExpenses,
      });
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: 'Internal server error', error });
    }
  });
};

// GET: /api/expenses/myExpenses
const getUserExpenses = async (req, res) => {
  try {
    const userId = req.user.userId;
    const expenses = await Expense.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({ expenses });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// GET: /api/expenses/all (Admin only)
const getAllExpenses = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.userId);
    if (!admin) {
      return res.status(403).json({ message: 'Access denied. Only admin can view all expenses.' });
    }

    const expenses = await Expense.find().populate('userId', 'name email').sort({ createdAt: -1 });
    res.status(200).json({ expenses });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// PATCH: /api/expenses/status/:id (Admin approves or rejects)
const updateExpenseStatus = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.userId);
    if (!admin) {
      return res.status(403).json({ message: 'Access denied. Only admin can update expense status.' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updatedExpense = await Expense.findByIdAndUpdate(id, { status }, { new: true });

    if (!updatedExpense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.status(200).json({ message: 'Expense status updated', data: updatedExpense });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error', error });
  }
};

export {
  submitExpenses,
  getUserExpenses,
  getAllExpenses,
  updateExpenseStatus,
};
