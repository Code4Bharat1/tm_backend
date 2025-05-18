import Post from '../models/createpost.model.js';

// Create a new post
export const createPost = async (req, res) => {
    try {
        const {
            userId,
            companyId,
            message,
            note,
            attachments,
            visibility,
        } = req.body;

        const newPost = new Post({
            userId,
            companyId,
            message,
            note,
            attachments,
            visibility,
        });

        const savedPost = await newPost.save();
        res.status(201).json({ success: true, data: savedPost });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating post', error });
    }
};

// Get all posts
export const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().populate('userId companyId');
        res.status(200).json({ success: true, data: posts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching posts', error });
    }
};

// Get post by ID
export const getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('userId companyId');
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        res.status(200).json({ success: true, data: post });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching post', error });
    }
};

// Update post
export const updatePost = async (req, res) => {
    try {
        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!updatedPost) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        res.status(200).json({ success: true, data: updatedPost });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating post', error });
    }
};

// Delete post
export const deletePost = async (req, res) => {
    try {
        const deletedPost = await Post.findByIdAndDelete(req.params.id);
        if (!deletedPost) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        res.status(200).json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting post', error });
    }
};
