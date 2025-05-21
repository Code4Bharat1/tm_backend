import express from 'express';
import { upload } from '../middleware/multer.middleware.js';
import {v2 as cloudinary} from 'cloudinary';

const router = express.Router();

router.post(
  '/',
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Extract available info from multer upload
    const fileInfo = {
      fileName: req.file.originalname,
      fileUrl: req.file.path,  // This is actually the secure URL despite being called 'path'
      publicId: req.file.filename,
      format: req.file.originalname.split('.').pop().toLowerCase(), // Extract extension from filename
      fileResourceType: req.file.mimetype.split('/')[0] === 'image' ? 'image' : 'raw' // Determine type from mimetype
    };
    
    res.status(200).json({
      message: 'File uploaded successfully to Cloudinary',
      ...fileInfo
    });
  }
);

// Optional: Add a route to delete a file from Cloudinary
router.delete('/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;


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
