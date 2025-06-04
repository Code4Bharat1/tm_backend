import express from "express";
import {
  getTasksByUserAndDate,
  createTask,
  updateTask,
  markTaskAsDone
} from '../controller/todo.controller.js';
import {protect} from '../middleware/authMiddleware.js'
const router = express.Router();

router.get('/getTask',protect, getTasksByUserAndDate);
router.post('/createTask',protect, createTask);
router.put('/:id', updateTask);
router.post('/mark-done', protect,markTaskAsDone);

export default router;