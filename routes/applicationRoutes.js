const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protectAdmin } = require('../middleware/authMiddleware');
const Application = require('../models/Application');
const emailService = require('../services/emailService');

// @route   POST /api/applications
// @desc    Submit a new application
// @access  Public
router.post(
  '/',
  [
    body('fullName', 'Full name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('phone', 'Phone number is required').not().isEmpty(),
    body('course', 'Course is required').not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const newApplication = new Application({
        ...req.body,
      });

      const application = await newApplication.save();

      // Send emails (Fire and Forget)
      emailService.sendApplicationConfirmation(application.email, application.fullName)
        .catch(err => console.error('Error sending confirmation email:', err));

      emailService.sendAdminApplicationNotification(application)
        .catch(err => console.error('Error sending admin notification email:', err));

      // Emit to admin dashboard
      const io = req.app.get('io');
      io.to('adminRoom').emit('newApplication', application);

      res.status(201).json(application);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/applications
// @desc    Get all applications
// @access  Admin
router.get('/', protectAdmin, async (req, res) => {
  try {
    const applications = await Application.find().sort({ createdAt: 'desc' });
    res.json(applications);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/applications/:id/status
// @desc    Approve or reject an application
// @access  Admin
router.put(
  '/:id/status',
  [
    protectAdmin,
    body('status', 'Status is required (approved/rejected)').isIn(['approved', 'rejected']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      let application = await Application.findById(req.params.id);
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }

      const { status } = req.body;

      application = await Application.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            status: status,
            reviewedBy: req.user.name,
            reviewedAt: Date.now(),
          },
        },
        { new: true }
      );

      // Send status update email to applicant
      await emailService.sendApplicationStatusUpdate(application.email, application.fullName, application.status);

      // Emit to admin dashboard
      const io = req.app.get('io');
      io.to('adminRoom').emit('updateApplication', application);

      res.json(application);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
