// controllers/userController.js
import User from '../models/user.model.js';
import Admin from '../models/admin.model.js';
import { v2 as cloudinary } from 'cloudinary';

// Helper function to extract public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;

  try {
    // Extract the public ID from the URL
    // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.jpg
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(part => part === 'upload');
    if (uploadIndex === -1) return null;

    // Get the part after version (v1234567890) or directly after upload
    let publicIdPart = parts.slice(uploadIndex + 1);
    if (publicIdPart[0] && publicIdPart[0].startsWith('v')) {
      publicIdPart = publicIdPart.slice(1); // Remove version part
    }

    // Join the remaining parts and remove file extension
    const publicIdWithExtension = publicIdPart.join('/');
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, ''); // Remove extension

    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

// Helper function to delete image from Cloudinary
const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl) return;

  const publicId = getPublicIdFromUrl(imageUrl);
  if (!publicId) return;

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Cloudinary deletion result:', result);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // from JWT
    console.log('User ID from token:', userId); // Debugging line
    const user = await User.findOne({
      _id: userId,
    }).select(
      'firstName lastName position phoneNumber email photoUrl gender address dateOfJoining',
    );

    if (!user) {
      return res
        .status(404)
        .json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Server error', error });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // Extracted from JWT by middleware

    const {
      firstName,
      lastName,
      phoneNumber,
      email,
      position,
      gender,
      address,
      dateOfJoining,
      photoUrl, // Added photoUrl support
    } = req.body;

    // Get current user data to check for existing photo
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res
        .status(404)
        .json({ message: 'User not found.' });
    }

    // If there's a new photo URL and it's different from the current one, delete the old photo
    if (photoUrl && currentUser.photoUrl && photoUrl !== currentUser.photoUrl) {
      await deleteFromCloudinary(currentUser.photoUrl);
    }

    const updateData = {
      firstName,
      lastName,
      phoneNumber,
      email,
      position,
      gender, // match schema capitalization
      address,
      dateOfJoining,
    };

    // Only update photoUrl if it's provided
    if (photoUrl !== undefined) {
      updateData.photoUrl = photoUrl;
    }

    const updatedUser =
      await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true },
      );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ message: 'User not found.' });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update error:', error);
    res
      .status(500)
      .json({ message: 'Internal server error' });
  }
};

const removeUserPhoto = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get current user data
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Delete the photo from Cloudinary if it exists
    if (currentUser.photoUrl) {
      await deleteFromCloudinary(currentUser.photoUrl);
    }

    // Update user record to remove photo URL
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $unset: { photoUrl: 1 } },
      { new: true }
    );

    res.status(200).json({
      message: 'Profile picture removed successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Remove photo error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getUserProfileAdmin = async (req, res) => {
  try {
    const adminId = req.user.adminId; // from JWT
    console.log('Admin ID from token:', adminId); // Debugging line
    const admin = await Admin.findOne({
      _id: adminId,
    }).select(
      'fullName position phone email photoUrl gender companyName dateOfJoining address',
    );

    if (!admin) {
      return res
        .status(404)
        .json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Server error', error });
  }
};

const updateProfileAdmin = async (req, res) => {
  try {
    const adminId = req.user.adminId; // Extracted from JWT by middleware

    const {
      fullName,
      phone,
      email,
      position,
      gender,
      dateOfJoining,
      address,
      photoUrl, // Added photoUrl support
    } = req.body;

    // Get current admin data to check for existing photo
    const currentAdmin = await Admin.findById(adminId);
    if (!currentAdmin) {
      return res
        .status(404)
        .json({ message: 'Admin not found.' });
    }

    // If there's a new photo URL and it's different from the current one, delete the old photo
    if (photoUrl && currentAdmin.photoUrl && photoUrl !== currentAdmin.photoUrl) {
      await deleteFromCloudinary(currentAdmin.photoUrl);
    }

    const updateData = {
      fullName,
      phone,
      email,
      position,
      gender,
      dateOfJoining,
      address,
    };

    // Only update photoUrl if it's provided
    if (photoUrl !== undefined) {
      updateData.photoUrl = photoUrl;
    }

    const updatedAdmin =
      await Admin.findByIdAndUpdate(
        adminId,
        updateData,
        { new: true },
      );

    if (!updatedAdmin) {
      return res
        .status(404)
        .json({ message: 'Admin not found.' });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error('Update error:', error);
    res
      .status(500)
      .json({ message: 'Internal server error' });
  }
};

const removeAdminPhoto = async (req, res) => {
  try {
    const adminId = req.user.adminId;

    // Get current admin data
    const currentAdmin = await Admin.findById(adminId);
    if (!currentAdmin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    // Delete the photo from Cloudinary if it exists
    if (currentAdmin.photoUrl) {
      await deleteFromCloudinary(currentAdmin.photoUrl);
    }

    // Update admin record to remove photo URL
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { $unset: { photoUrl: 1 } },
      { new: true }
    );

    res.status(200).json({
      message: 'Profile picture removed successfully',
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error('Remove photo error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getAllUsersByCompany = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res
        .status(400)
        .json({
          message:
            'Company ID not found in token',
        });
    }

    const users = await User.find({
      companyId,
    }).select(
      'userId firstName lastName email phoneNumber position photoUrl',
    );

    res.status(200).json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(
      'Error fetching users by company:',
      error,
    );
    res
      .status(500)
      .json({
        message:
          'Server error while fetching users',
      });
  }
};

export {
  getUserProfile,
  updateProfile,
  removeUserPhoto,
  getUserProfileAdmin,
  updateProfileAdmin,
  removeAdminPhoto,
  getAllUsersByCompany,
};