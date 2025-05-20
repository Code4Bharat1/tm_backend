import express from 'express';
import { upload } from '../middleware/multer.middleware.js';

const router = express.Router();

router.post(
  '/',
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: 'No file uploaded' });
    }

    // When using Cloudinary, multer-storage-cloudinary automatically
    // adds Cloudinary-specific information to the file object
    const fileInfo = {
      fileName: req.file.originalname,
      fileUrl: req.file.path, // Cloudinary secure URL
      publicId: req.file.filename, // Cloudinary public ID (useful for deletion later)
      format: req.file.format,
      resourceType: req.file.resource_type,
    };

    res.status(200).json({
      message:
        'File uploaded successfully to Cloudinary',
      ...fileInfo,
    });
  },
);

// Optional: Add a route to delete a file from Cloudinary
router.delete('/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;

    // Import cloudinary for deletion
    const { v2: cloudinary } = await import(
      'cloudinary'
    );

    // Delete the file from Cloudinary
    const result =
      await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      res
        .status(200)
        .json({
          message: 'File deleted successfully',
        });
    } else {
      res
        .status(400)
        .json({
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
