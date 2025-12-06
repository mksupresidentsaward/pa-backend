const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protectAdmin } = require('../middleware/authMiddleware');
const { uploadAvatar, validateFileSize, MAX_IMAGE_SIZE } = require('../middleware/uploadMiddleware');
const User = require('../models/user');
const { deleteFile } = require('../utils/fileUtils');
const sharp = require('sharp');
const path = require('path');

// @route   PUT /api/users/me/avatar
// @desc    Upload/update admin avatar (Admin only)
// @access  Admin
router.put(
  '/me/avatar',
  protectAdmin,
  uploadAvatar.single('avatar'),
  validateFileSize(MAX_IMAGE_SIZE),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file uploaded' });
      }

      // Resize image to 256x256 using sharp (optional but recommended)
      const resizedPath = path.join(
        path.dirname(req.file.path),
        `resized-${req.file.filename}`
      );

      try {
        await sharp(req.file.path)
          .resize(256, 256, {
            fit: 'cover',
            position: 'center',
          })
          .jpeg({ quality: 90 })
          .toFile(resizedPath);

        // Delete original and use resized version
        await deleteFile(req.file.path);
        req.file.path = resizedPath;
        req.file.filename = `resized-${req.file.filename}`;
      } catch (sharpError) {
        console.warn('Sharp resize failed, using original:', sharpError);
        // Continue with original if sharp fails
      }

      // Delete old avatar if exists
      if (req.user.avatar) {
        const oldAvatarPath = path.join(process.env.UPLOADS_PATH || './uploads', 'avatars', path.basename(req.user.avatar));
        await deleteFile(oldAvatarPath);
      }

      // Update user avatar
      req.user.avatar = `/uploads/avatars/${req.file.filename}`;
      await req.user.save();

      res.json({
        avatar: req.user.avatar,
        message: 'Avatar updated successfully',
      });
    } catch (err) {
      console.error('Avatar upload error:', err);
      // Clean up uploaded file on error
      if (req.file) {
        await deleteFile(req.file.path);
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   DELETE /api/users/me/avatar
// @desc    Delete admin avatar (Admin only)
// @access  Admin
router.delete('/me/avatar', protectAdmin, async (req, res) => {
  try {
    if (!req.user.avatar) {
      return res.status(400).json({ message: 'No avatar to delete' });
    }

    const avatarPath = path.join(process.env.UPLOADS_PATH || './uploads', 'avatars', path.basename(req.user.avatar));
    await deleteFile(avatarPath);

    req.user.avatar = null;
    await req.user.save();

    res.json({ message: 'Avatar deleted successfully' });
  } catch (err) {
    console.error('Avatar delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/me/profile
// @desc    Update admin profile (name, email) (Admin only)
// @access  Admin
router.put(
  '/me/profile',
  protectAdmin,
  [
    body('name', 'Name is required').optional().not().isEmpty().trim(),
    body('email', 'Please include a valid email').optional().isEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, email } = req.body;

      if (name) {
        req.user.name = name.trim();
      }

      if (email && email !== req.user.email) {
        // Check if email is already taken
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
          return res.status(400).json({ message: 'Email already in use' });
        }
        req.user.email = email;
      }

      await req.user.save();

      res.json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
        role: req.user.role,
        superAdmin: req.user.superAdmin,
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/users/me
// @desc    Get current user profile (Admin only)
// @access  Admin
router.get('/me', protectAdmin, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    avatar: req.user.avatar,
    role: req.user.role,
    superAdmin: req.user.superAdmin,
    lastActiveAt: req.user.lastActiveAt,
  });
});

// @route   GET /api/users
// @desc    Get all admins (Super Admin only)
// @access  Super Admin
router.get('/', protectAdmin, async (req, res) => {
  try {
    // Check if user is super admin
    if (!req.user.superAdmin) {
      return res.status(403).json({ message: 'Not authorized. Super admin access required.' });
    }

    const admins = await User.find({ role: 'admin' })
      .select('-password')
      .sort({ createdAt: 'desc' });

    res.json(admins);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete an admin (Super Admin only)
// @access  Super Admin
router.delete('/:id', protectAdmin, async (req, res) => {
  try {
    // Check if user is super admin
    if (!req.user.superAdmin) {
      return res.status(403).json({ message: 'Not authorized. Super admin access required.' });
    }

    const adminToDelete = await User.findById(req.params.id);

    if (!adminToDelete) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Prevent deleting yourself
    if (adminToDelete._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Prevent deleting the last super admin
    if (adminToDelete.superAdmin) {
      const superAdminCount = await User.countDocuments({ superAdmin: true });
      if (superAdminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last super admin' });
      }
    }

    // Delete avatar if exists
    if (adminToDelete.avatar) {
      const avatarPath = path.join(process.env.UPLOADS_PATH || './uploads', 'avatars', path.basename(adminToDelete.avatar));
      await deleteFile(avatarPath).catch(err => console.warn('Error deleting avatar:', err));
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'Admin deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

