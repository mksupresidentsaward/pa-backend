const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protectAdmin } = require('../middleware/authMiddleware');
const Content = require('../models/Content');

// @route   GET /api/admin/content
// @desc    Get all content blocks
// @access  Public (for frontend rendering)
router.get('/', async (req, res) => {
  try {
    const contents = await Content.find().select('key value updatedAt');
    const contentMap = {};
    contents.forEach((item) => {
      contentMap[item.key] = item.value;
    });
    res.json(contentMap);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/content/:key
// @desc    Get specific content block by key
// @access  Public
router.get('/:key', async (req, res) => {
  try {
    const content = await Content.findOne({ key: req.params.key.toLowerCase() });
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    res.json({ key: content.key, value: content.value });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/content/:key
// @desc    Update or create content block (Admin only)
// @access  Admin
router.put(
  '/:key',
  protectAdmin,
  [body('value', 'Value is required').not().isEmpty().trim()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const key = req.params.key.toLowerCase().trim();
      const { value } = req.body;

      const content = await Content.findOneAndUpdate(
        { key },
        {
          key,
          value: value.trim(),
          updatedAt: new Date(),
          updatedBy: req.user.name,
          updatedById: req.user._id,
        },
        { upsert: true, new: true }
      );

      res.json({
        key: content.key,
        value: content.value,
        updatedAt: content.updatedAt,
        updatedBy: content.updatedBy,
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;

