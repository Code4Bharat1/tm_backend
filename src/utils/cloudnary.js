
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov'];

// Optional: helper for cleaning up local file
const tryCleanup = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    console.error(`Cleanup failed for ${filePath}:`, err.message);
  }
};

/**
 * Uploads a file to Cloudinary and deletes the local copy.
 * @param {string} localFilePath - Absolute path to the file
 * @param {object} options - Optional config like folder or tenant info
 * @param {string} options.folder - Cloudinary folder path (e.g., 'uploads/user123')
 * @returns {Promise<object|null>} Upload result or error
 */

 const uploadOnCloudinary = async (localFilePath, options = {}) => {
  if (!localFilePath) {
    console.error('No file path provided');
    return null;
  }

  const ext = path.extname(localFilePath).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    await tryCleanup(localFilePath);
    return {
      error: 'Unsupported file format',
      file: localFilePath,
    };
  }

  try {
    await fs.access(localFilePath); // Confirm file exists

    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
      folder: options.folder || 'uploads',
      allowed_formats: allowedExtensions.map(ext => ext.replace('.', '')),
      quality_analysis: true,
      invalidate: true,
    });

    await tryCleanup(localFilePath);

    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      resource_type: result.resource_type,
    };

  } catch (error) {
    console.error(`Cloudinary Upload Error (${localFilePath}):`, error.message);
    await tryCleanup(localFilePath);

    return {
      error: 'File upload failed',
      code: error.http_code || 500,
      message: error.message,
      file: localFilePath,
    };
  }
};

/**
 * Delete File from Cloudinary
 */
const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error("Cloudinary Delete Error: ", error.message);
    }
};

export { uploadOnCloudinary, deleteFromCloudinary };
