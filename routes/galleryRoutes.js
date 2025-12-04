const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protectAdmin } = require('../middleware/authMiddleware');
const { uploadGallery, validateFileSize, MAX_IMAGE_SIZE } = require('../middleware/uploadMiddleware');
const GalleryImage = require('../models/GalleryImage');
const { deleteFile } = require('../utils/fileUtils');

// Maximum uploads per admin per day
const MAX_UPLOADS_PER_DAY = 5;

/**
 * Check if admin has reached daily upload limit
 */
async function checkDailyUploadLimit(adminId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const count = await GalleryImage.countDocuments({
    uploadedById: adminId,
    createdAt: {
      $gte: today,
      $lt: tomorrow,
    },
  });

  return {
    count,
    remaining: Math.max(0, MAX_UPLOADS_PER_DAY - count),
    limit: MAX_UPLOADS_PER_DAY,
  };
}

// @route   POST /api/gallery/upload
// @desc    Upload gallery image (Admin only)
// @access  Admin
router.post(
  '/upload',
  protectAdmin,
  // 1. MULTER MUST RUN FIRST to parse multipart/form-data and populate req.body
  uploadGallery.single('image'),
  // 2. NOW we can validate the body fields (title, category)
  [
    body('title', 'Title is required').not().isEmpty().trim(),
    body('category', 'Category is required').isIn(['adventure', 'service', 'training', 'ceremony', 'other']), // Added 'other' to match your dropdown
  ],
  validateFileSize(MAX_IMAGE_SIZE),
  async (req, res) => {
    // 3. Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded file on validation error (since Multer already saved it)
      if (req.file) {
        await deleteFile(req.file.path);
      }
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file uploaded' });
      }

      // Check daily upload limit
      const uploadLimit = await checkDailyUploadLimit(req.user._id);
      if (uploadLimit.count >= uploadLimit.limit) {
        // Clean up uploaded file
        await deleteFile(req.file.path);
        return res.status(403).json({
          message: `Daily upload limit reached. Maximum ${MAX_UPLOADS_PER_DAY} uploads per day.`,
          limit: uploadLimit.limit,
          count: uploadLimit.count,
          remaining: 0,
        });
      }

      const galleryImage = new GalleryImage({
        title: req.body.title.trim(),
        description: req.body.description?.trim() || '',
        category: req.body.category,
        filename: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        uploadedBy: req.user.name,
        uploadedById: req.user._id,
      });

      await galleryImage.save();

      // Emit to all connected clients via Socket.IO
      const io = req.app.get('io');
      io.emit('newGalleryImage', {
        _id: galleryImage._id,
        title: galleryImage.title,
        description: galleryImage.description,
        category: galleryImage.category,
        imageUrl: `/uploads/gallery/${galleryImage.category}/${galleryImage.filename}`,
        uploadedBy: galleryImage.uploadedBy,
        createdAt: galleryImage.createdAt,
      });

      // Get updated upload limit
      const updatedLimit = await checkDailyUploadLimit(req.user._id);

      res.status(201).json({
        _id: galleryImage._id,
        title: galleryImage.title,
        description: galleryImage.description,
        category: galleryImage.category,
        imageUrl: `/uploads/gallery/${galleryImage.category}/${galleryImage.filename}`,
        uploadedBy: galleryImage.uploadedBy,
        createdAt: galleryImage.createdAt,
        uploadLimit: updatedLimit,
      });
    } catch (err) {
      console.error('Gallery upload error:', err);
      // Clean up uploaded file on error
      if (req.file) {
        await deleteFile(req.file.path);
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/gallery
// @desc    Get gallery images with pagination and filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const category = req.query.category;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    const skip = (page - 1) * limit;

    const query = category ? { category } : {};

    const [images, total] = await Promise.all([
      GalleryImage.find(query)
        .select('title description category filename uploadedBy createdAt')
        .sort({ createdAt: 'desc' })
        .skip(skip)
        .limit(limit),
      GalleryImage.countDocuments(query),
    ]);

    const imagesWithUrls = images.map((img) => ({
      _id: img._id,
      title: img.title,
      description: img.description,
      category: img.category,
      imageUrl: `/uploads/gallery/${img.category}/${img.filename}`,
      uploadedBy: img.uploadedBy,
      createdAt: img.createdAt,
    }));

    res.json({
      images: imagesWithUrls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/gallery/latest
// @desc    Get latest gallery images (for real-time updates)
// @access  Public
router.get('/latest', async (req, res) => {
  try {
    const images = await GalleryImage.find()
      .select('title description category filename uploadedBy createdAt')
      .sort({ createdAt: 'desc' })
      .limit(50);

    const imagesWithUrls = images.map((img) => ({
      _id: img._id,
      title: img.title,
      description: img.description,
      category: img.category,
      imageUrl: `/uploads/gallery/${img.category}/${img.filename}`,
      uploadedBy: img.uploadedBy,
      createdAt: img.createdAt,
    }));

    res.json(imagesWithUrls);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/gallery/upload-limit
// @desc    Get current upload limit status for admin
// @access  Admin
router.get('/upload-limit', protectAdmin, async (req, res) => {
  try {
    const uploadLimit = await checkDailyUploadLimit(req.user._id);
    res.json(uploadLimit);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/gallery/:id
// @desc    Delete gallery image (Admin only)
// @access  Admin
router.delete('/:id', protectAdmin, async (req, res) => {
  try {
    const image = await GalleryImage.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Only allow deletion by the uploader or super admin
    if (image.uploadedById.toString() !== req.user._id.toString() && !req.user.superAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this image' });
    }

    // Delete file from filesystem
    await deleteFile(image.filePath);

    // Delete from database
    await GalleryImage.findByIdAndDelete(req.params.id);

    // Emit deletion event
    const io = req.app.get('io');
    io.emit('deleteGalleryImage', { id: req.params.id });

    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;