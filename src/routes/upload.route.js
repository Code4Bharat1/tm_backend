import express from 'express';
import { upload } from '../middleware/multer.middleware.js';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

router.post(
  '/',
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: 'No file uploaded' });
    }

    // Extract available info from multer upload
    const fileInfo = {
      fileName: req.file.originalname,
      fileUrl: req.file.path, // This is actually the secure URL despite being called 'path'
      publicId: req.file.filename,
      format: req.file.originalname
        .split('.')
        .pop()
        .toLowerCase(), // Extract extension from filename
      fileResourceType:
        req.file.mimetype.split('/')[0] ===
        'image'
          ? 'image'
          : 'raw', // Determine type from mimetype
    };

    res.status(200).json({
      message:
        'File uploaded successfully to Cloudinary',
      ...fileInfo,
    });
  },
);

// Profile image specific upload with better folder organization
router.post(
  '/profile',
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: 'No file uploaded' });
    }

    // Validate that it's an image
    if (!req.file.mimetype.startsWith('image/')) {
      return res
        .status(400)
        .json({
          message:
            'Only image files are allowed for profile pictures',
        });
    }

    try {
      // Re-upload to profile-specific folder if needed
      const result =
        await cloudinary.uploader.upload(
          req.file.path,
          {
            folder: 'profile-images',
            transformation: [
              {
                width: 500,
                height: 500,
                crop: 'fill',
                gravity: 'face',
              },
              { quality: 'auto:good' },
            ],
          },
        );

      // Delete the original upload if it was in a different folder
      if (
        req.file.filename &&
        req.file.filename !== result.public_id
      ) {
        try {
          await cloudinary.uploader.destroy(
            req.file.filename,
          );
        } catch (deleteError) {
          console.error(
            'Error deleting original upload:',
            deleteError,
          );
        }
      }

      const fileInfo = {
        fileName: req.file.originalname,
        fileUrl: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        fileResourceType: 'image',
      };

      res.status(200).json({
        message:
          'Profile image uploaded successfully',
        ...fileInfo,
      });
    } catch (error) {
      console.error(
        'Error processing profile image:',
        error,
      );
      res
        .status(500)
        .json({
          message:
            'Error processing profile image',
        });
    }
  },
);

// Optional: Add a route to delete a file from Cloudinary
router.delete('/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;

    // Delete the file from Cloudinary
    const result =
      await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      res.status(200).json({
        message: 'File deleted successfully',
      });
    } else {
      res.status(400).json({
        message: 'File deletion failed',
        result,
      });
    }
  } catch (error) {
    console.error(
      'Error deleting file from Cloudinary:',
      error,
    );
    res
      .status(500)
      .json({ message: 'Internal server error' });
  }
});

export default router;
