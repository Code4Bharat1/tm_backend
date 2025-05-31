// middleware/multer-s3.middleware.js
import multer from 'multer';

const storage = multer.memoryStorage(); // keep file in RAM for S3 upload

const uploadS3 = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|csv|xlsx|xls|doc|docx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only document files are allowed.'));
    }
  },
});

export default uploadS3;
