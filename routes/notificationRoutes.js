const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protectAdmin } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');

// @route   GET /api/notifications
// @desc    Get all active notifications (Public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const notifications = await Notification.find({
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    })
      .select('title message type priority createdAt')
      .sort({ createdAt: 'desc' })
      .limit(10); // Limit to 10 most recent notifications

    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/notifications/all
// @desc    Get all notifications (Admin only)
// @access  Admin
router.get('/all', protectAdmin, async (req, res) => {
  try {
    const notifications = await Notification.find({})
      .select('-__v')
      .sort({ createdAt: 'desc' });

    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/notifications
// @desc    Create a new notification (Admin only)
// @access  Admin
router.post(
  '/',
  protectAdmin,
  [
    body('title', 'Title is required').not().isEmpty().trim(),
    body('message', 'Message is required').not().isEmpty(),
    body('type', 'Invalid notification type').optional().isIn(['info', 'success', 'warning', 'error']),
    body('priority', 'Invalid priority').optional().isIn(['low', 'medium', 'high']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, message, type = 'info', priority = 'medium', expiresAt = null } = req.body;

      const notification = new Notification({
        title,
        message,
        type,
        priority,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: req.user.name,
        createdById: req.user._id,
      });

      await notification.save();

      // Emit new notification event via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.emit('newNotification', {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          createdAt: notification.createdAt,
        });
      }

      res.status(201).json({
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        isActive: notification.isActive,
        createdBy: notification.createdBy,
        createdAt: notification.createdAt,
        expiresAt: notification.expiresAt,
      });
    } catch (err) {
      console.error('Notification creation error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/notifications/:id
// @desc    Update a notification (Admin only)
// @access  Admin
router.put(
  '/:id',
  protectAdmin,
  [
    body('title', 'Title is required').optional().not().isEmpty().trim(),
    body('message', 'Message is required').optional().not().isEmpty(),
    body('type', 'Invalid notification type').optional().isIn(['info', 'success', 'warning', 'error']),
    body('priority', 'Invalid priority').optional().isIn(['low', 'medium', 'high']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, message, type, priority, isActive, expiresAt } = req.body;

      const notification = await Notification.findById(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      // Update fields
      if (title !== undefined) notification.title = title;
      if (message !== undefined) notification.message = message;
      if (type !== undefined) notification.type = type;
      if (priority !== undefined) notification.priority = priority;
      if (isActive !== undefined) notification.isActive = isActive;
      if (expiresAt !== undefined) {
        notification.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }

      notification.updatedAt = Date.now();
      await notification.save();

      // Emit update notification event via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.emit('updateNotification', {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          isActive: notification.isActive,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt,
        });
      }

      res.json({
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        isActive: notification.isActive,
        createdBy: notification.createdBy,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
        expiresAt: notification.expiresAt,
      });
    } catch (err) {
      console.error('Notification update error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification (Admin only)
// @access  Admin
router.delete('/:id', protectAdmin, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await Notification.findByIdAndDelete(req.params.id);

    // Emit delete notification event via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('deleteNotification', { _id: notification._id });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    console.error('Notification deletion error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;




