import express from 'express';
import {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  proxyDownload,
  getUserPosts,
  markPostAsRead,
  saveDraft,
  getPostAnalytics,
  getPositions,
} from '../controller/createpost.controller.js';
import { protect, protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin routes
router.get('/positions', protectAdmin, getPositions);
router.post('/create', protectAdmin, createPost);
router.post('/draft', protectAdmin, saveDraft);
router.get('/getAllPosts', protectAdmin, getAllPosts);
router.get('/analytics/:postId', protectAdmin, getPostAnalytics);
router.put('/:id', protectAdmin, updatePost);
router.delete('/:id', protectAdmin, deletePost);

// User routes
router.get('/getUserPosts', protect, getUserPosts);
router.post('/:id/read', protect, markPostAsRead);

// Shared routes
router.get('/:id', protect, getPostById);
router.post('/proxyDownload', proxyDownload);

export default router;