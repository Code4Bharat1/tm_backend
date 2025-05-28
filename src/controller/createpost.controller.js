import axios from 'axios';
import Post from '../models/createpost.model.js';
import User from '../models/user.model.js';

// Get available positions for target audience
export const getPositions = async (req, res) => {
  try {
    const { companyId } = req.user;
    
    const positions = await User.distinct('position', { companyId });
    const positionsWithCount = await Promise.all(
      positions.map(async (position) => {
        const count = await User.countDocuments({ companyId, position });
        return { id: position.toLowerCase().replace(/\s+/g, ''), name: position, count };
      })
    );

    // Add "All Employees" option
    const totalCount = await User.countDocuments({ companyId });
    const allPositions = [
      { id: 'all', name: 'All Employees', count: totalCount },
      ...positionsWithCount
    ];

    res.status(200).json({ positions: allPositions });
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create post with enhanced validation and scheduling
export const createPost = async (req, res) => {
  try {
    const { adminId, companyId } = req.user;
    const {
      message, note, postType, priority, targetAudience, tags, attachments,
      schedule, status = 'published'
    } = req.body;

    // Validation
    if (!message?.trim() || !note?.trim()) {
      return res.status(400).json({ message: 'Message and note are required' });
    }

    if (!targetAudience?.positions?.length) {
      return res.status(400).json({ message: 'Target audience is required' });
    }

    // Process schedule
    const processedSchedule = {
      type: schedule?.type || 'immediate',
      scheduledAt: schedule?.type === 'scheduled' ? new Date(schedule.datetime) : null,
      timezone: schedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      recurring: {
        enabled: schedule?.recurring || false,
        type: schedule?.recurringType,
        endDate: schedule?.endDate ? new Date(schedule.endDate) : null,
      }
    };

    // Determine post status
    const postStatus = processedSchedule.type === 'scheduled' ? 'scheduled' : status;
    const publishedAt = processedSchedule.type === 'immediate' ? new Date() : processedSchedule.scheduledAt;

    const newPost = new Post({
      adminId,
      companyId,
      message: message.trim(),
      note: note.trim(),
      postType: postType || 'announcement',
      priority: priority || 'medium',
      targetAudience: {
        positions: targetAudience.positions,
        departments: targetAudience.departments || [],
      },
      tags: tags || [],
      attachments: attachments || [],
      schedule: processedSchedule,
      status: postStatus,
      publishedAt,
    });

    const savedPost = await newPost.save();

    // If scheduled, you might want to set up a job queue here
    if (postStatus === 'scheduled') {
      // TODO: Add job to queue for scheduled posting
      console.log(`Post scheduled for: ${processedSchedule.scheduledAt}`);
    }

    res.status(201).json({
      message: 'Post created successfully',
      data: savedPost,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get posts for admin with filters
export const getAllPosts = async (req, res) => {
  try {
    const { adminId, companyId } = req.user;
    const { status, postType, priority, page = 1, limit = 10 } = req.query;

    const filter = { adminId, companyId };
    if (status) filter.status = status;
    if (postType) filter.postType = postType;
    if (priority) filter.priority = priority;

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('readBy.userId', 'firstName lastName')
      .lean();

    const total = await Post.countDocuments(filter);

    res.status(200).json({
      posts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get posts for users based on their position
export const getUserPosts = async (req, res) => {
  try {
    const { companyId } = req.user;
    const userId = req.user.userId;
    
    // Get user's position
    const user = await User.findById(userId).select('position');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { page = 1, limit = 10, unreadOnly } = req.query;

    // Build filter for posts
    const filter = {
      companyId,
      status: 'published',
      $or: [
        { 'targetAudience.positions': 'all' },
        { 'targetAudience.positions': user.position }
      ],
      publishedAt: { $lte: new Date() }
    };

    // Filter for unread posts only
    if (unreadOnly === 'true') {
      filter['readBy.userId'] = { $ne: userId };
    }

    const posts = await Post.find(filter)
      .sort({ publishedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-readBy') // Don't send readBy array to users
      .lean();

    // Add read status for current user
    const postsWithReadStatus = posts.map(post => ({
      ...post,
      isRead: post.readBy?.some(read => read.userId.toString() === userId.toString()) || false
    }));

    const total = await Post.countDocuments(filter);

    res.status(200).json({
      posts: postsWithReadStatus,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Mark post as read
export const markPostAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if already read
    const alreadyRead = post.readBy.some(read => read.userId.toString() === userId.toString());
    if (!alreadyRead) {
      post.readBy.push({ userId, readAt: new Date() });
      await post.save();
    }

    res.status(200).json({ message: 'Post marked as read' });
  } catch (error) {
    console.error('Error marking post as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get post by ID with read tracking
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const post = await Post.findById(id)
      .populate('adminId', 'firstName lastName')
      .populate('readBy.userId', 'firstName lastName');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // If user is authenticated, check read status
    let isRead = false;
    if (userId) {
      isRead = post.readBy.some(read => read.userId._id.toString() === userId.toString());
    }

    const postData = {
      ...post.toObject(),
      isRead,
      readCount: post.readBy.length,
    };

    res.status(200).json({ success: true, data: postData });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Error fetching post' });
  }
};

// Update post
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId, companyId } = req.user;
    
    // Ensure admin can only update their own posts
    const existingPost = await Post.findOne({ _id: id, adminId, companyId });
    if (!existingPost) {
      return res.status(404).json({ message: 'Post not found or unauthorized' });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedPost });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Error updating post' });
  }
};

// Delete post
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId, companyId } = req.user;

    const deletedPost = await Post.findOneAndDelete({ _id: id, adminId, companyId });
    if (!deletedPost) {
      return res.status(404).json({ message: 'Post not found or unauthorized' });
    }

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Error deleting post' });
  }
};

// Save as draft
export const saveDraft = async (req, res) => {
  try {
    const { adminId, companyId } = req.user;
    
    const draftPost = new Post({
      ...req.body,
      adminId,
      companyId,
      status: 'draft',
    });

    const savedDraft = await draftPost.save();
    res.status(201).json({ message: 'Draft saved successfully', data: savedDraft });
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ message: 'Error saving draft' });
  }
};

// Get analytics
export const getPostAnalytics = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { postId } = req.params;

    const post = await Post.findOne({ _id: postId, companyId })
      .populate('readBy.userId', 'firstName lastName position');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Get total target audience count
    let targetCount = 0;
    if (post.targetAudience.positions.includes('all')) {
      targetCount = await User.countDocuments({ companyId });
    } else {
      targetCount = await User.countDocuments({
        companyId,
        position: { $in: post.targetAudience.positions }
      });
    }

    const analytics = {
      totalTargeted: targetCount,
      totalRead: post.readBy.length,
      readPercentage: targetCount > 0 ? ((post.readBy.length / targetCount) * 100).toFixed(1) : 0,
      readByPosition: {},
      readByDate: {},
    };

    // Group reads by position and date
    post.readBy.forEach(read => {
      const position = read.userId.position;
      const date = read.readAt.toISOString().split('T')[0];

      analytics.readByPosition[position] = (analytics.readByPosition[position] || 0) + 1;
      analytics.readByDate[date] = (analytics.readByDate[date] || 0) + 1;
    });

    res.status(200).json({ analytics });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
};

// Proxy download (unchanged)
export const proxyDownload = async (req, res) => {
  try {
    const { fileUrl, fileName } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: 'File URL is required' });
    }

    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });

    res.setHeader('Content-Type', response.headers['content-type']);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName || 'download'}"`);

    return res.send(response.data);
  } catch (error) {
    console.error('Error proxying download:', error);
    return res.status(500).json({ error: 'Failed to download file' });
  }
};