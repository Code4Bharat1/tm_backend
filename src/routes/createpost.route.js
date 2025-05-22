import express from 'express';
import {
    createPost,
    getAllPosts,
    getPostById,
    updatePost,
    deletePost,
    proxyDownload,
    getUserPosts,
} from '../controller/createpost.controller.js';
import { protect, protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create', protectAdmin, createPost);
router.get('/getAllPosts',protectAdmin, getAllPosts);
router.get('/getUserPosts', protect, getUserPosts)
router.get('/:id', getPostById);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);
router.post('/proxyDownload', proxyDownload)

export default router;
