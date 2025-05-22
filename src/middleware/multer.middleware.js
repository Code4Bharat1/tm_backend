// middleware/multer.middleware.js
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from '../utils/cloudinary.utils.js';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = file.originalname
      .split('.')
      .pop()
      .toLowerCase();
    const isImage = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
    ].includes(ext);

    // Determine folder based on route or file type
    let folder = 'uploads';
    if (
      req.route &&
      req.route.path.includes('profile')
    ) {
      folder = 'profile-images';
    } else if (isImage) {
      folder = 'images';
    } else {
      folder = 'documents';
    }

    return {
      folder: folder,
      allowed_formats: [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'pdf',
        'doc',
        'docx',
        'xlsx',
        'csv',
      ],
      resource_type: isImage ? 'image' : 'raw',
      transformation:
        isImage && folder === 'profile-images'
          ? [
              {
                width: 800,
                height: 800,
                crop: 'limit',
              },
              { quality: 'auto:good' },
            ]
          : isImage
          ? [
              {
                width: 1000,
                height: 1000,
                crop: 'limit',
              },
            ]
          : undefined,
    };
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes =
      /jpeg|jpg|png|gif|webp|pdf|doc|docx|xlsx|csv/;
    const extname = allowedTypes.test(
      file.originalname.toLowerCase(),
    );
    const mimetype = allowedTypes.test(
      file.mimetype,
    );

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only images and documents are allowed.',
        ),
      );
    }
  },
});

// Specific upload configuration for profile images
export const uploadProfile = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'profile-images',
      allowed_formats: [
        'jpg',
        'jpeg',
        'png',
        'webp',
      ],
      resource_type: 'image',
      transformation: [
        {
          width: 800,
          height: 800,
          crop: 'limit',
        },
        { quality: 'auto:good' },
      ],
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB for profile images
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files for profile pictures
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Only image files are allowed for profile pictures.',
        ),
      );
    }
  },
});
