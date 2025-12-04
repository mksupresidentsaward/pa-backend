const multer = require('multer');
const path = require('path');
const { generateUniqueFilename, ensureDirectoryExists, isValidFileType, isValidFileSize } = require('../utils/fileUtils');

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_ALL_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Base uploads directory
const UPLOADS_BASE = process.env.UPLOADS_PATH || './uploads';

/**
 * Configure storage for documents
 */
const documentStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(UPLOADS_BASE, 'documents');
    await ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = generateUniqueFilename(file.originalname);
    cb(null, uniqueName);
  },
});

/**
 * Configure storage for gallery images
 */
const galleryStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const category = req.body.category || 'other';
    const uploadPath = path.join(UPLOADS_BASE, 'gallery', category);
    await ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = generateUniqueFilename(file.originalname);
    cb(null, uniqueName);
  },
});

/**
 * Configure storage for avatars
 */
const avatarStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(UPLOADS_BASE, 'avatars');
    await ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = generateUniqueFilename(file.originalname);
    cb(null, uniqueName);
  },
});

/**
 * File filter for documents
 */
const documentFileFilter = (req, file, cb) => {
  if (isValidFileType(file.mimetype, ALLOWED_DOCUMENT_TYPES)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`), false);
  }
};

/**
 * File filter for images (gallery and avatars)
 */
const imageFileFilter = (req, file, cb) => {
  if (isValidFileType(file.mimetype, ALLOWED_IMAGE_TYPES)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`), false);
  }
};

/**
 * Multer instance for document uploads
 */
const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
  },
});

/**
 * Multer instance for gallery image uploads
 */
const uploadGallery = multer({
  storage: galleryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
});

/**
 * Multer instance for avatar uploads
 */
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
});

/**
 * Middleware to validate file size after multer
 */
const validateFileSize = (maxSize) => (req, res, next) => {
  if (req.file) {
    if (!isValidFileSize(req.file.size, maxSize)) {
      return res.status(400).json({
        message: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
      });
    }
  }
  next();
};

module.exports = {
  uploadDocument,
  uploadGallery,
  uploadAvatar,
  validateFileSize,
  MAX_IMAGE_SIZE,
  MAX_DOCUMENT_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
};

