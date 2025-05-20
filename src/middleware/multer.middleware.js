import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set up storage engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'expense-receipts', // Set your preferred folder name
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xlsx', 'csv'], // Adjust as needed
    resource_type: 'auto', // Automatically detect resource type
    // Optional transformations for images
    transformation: [
      { width: 1000, height: 1000, crop: "limit" } // Resize large images while keeping aspect ratio
    ]
  }
});

// Create multer upload middleware
export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit (adjust as needed)
  },
  fileFilter: (req, file, cb) => {
    // Optional: Add file type validation here if needed
    cb(null, true);
  }
});