import Task from '../models/todo.model.js';

// @desc    Get tasks by userId and date
// @route   GET /api/todo?userId=xxx&date=dd-mm-yyyy
export const getTasksByUserAndDate = async (req, res) => {
    try {
        const { date } = req.query;
        const { userId } = req.user
        if (!userId || !date) {
            return res.status(400).json({ message: 'Missing userId or date' });
        }

        const tasks = await Task.find({ userId, date });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Create new task
// @route   POST /api/todo
export const createTask = async (req, res) => {
    try {
        const {

            task,
            date,
            startTime,
            endTime,
            duration,
            type,
        } = req.body;
        console.log(req.body)
        const { userId, companyId } = req.user
        if (!userId || !companyId || !task || !date || !startTime || !endTime) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Determine if the task is already expired
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
            now.getMinutes()
        ).padStart(2, '0')}`;
        const isExpired = endTime <= currentTime;

        const newTask = new Task({
            userId,
            companyId,
            task,
            date,
            startTime,
            endTime,
            duration,
            type: type || 'To-Do',
            expired: isExpired,
        });

        await newTask.save();
        res.status(201).json(newTask);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update a task (e.g., mark as done or expired)
// @route   PUT /api/todo/:id
export const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updatedTask = await Task.findByIdAndUpdate(id, updates, {
            new: true,
        });

        if (!updatedTask) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json(updatedTask);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const markTaskAsDone = async (req, res) => {
  try {
    const { date, task, startTime } = req.body;
    const { userId, companyId } = req.user;

    if (!userId || !companyId) {
      return res.status(401).json({ error: 'Missing authentication cookies.' });
    }

    if (!date || !task || !startTime) {
      return res.status(400).json({ error: 'Missing task parameters.' });
    }

    // Find and update the task
    const updatedTask = await Task.findOneAndUpdate(
      { userId, companyId, date, task, startTime },
      { $set: { done: true, expired: false } },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Error in markTaskAsDone:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};