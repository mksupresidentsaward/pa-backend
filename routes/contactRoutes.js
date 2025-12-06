const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protectAdmin } = require('../middleware/authMiddleware');
const Contact = require('../models/Contact');
const emailService = require('../services/emailService');

// @route   POST /api/contact
// @desc    Submit a contact form message
// @access  Public
router.post(
  '/',
  [
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('subject', 'Subject is required').not().isEmpty(),
    body('message', 'Message is required').not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const newContact = new Contact({
        ...req.body,
      });

      const contact = await newContact.save();

      // Send emails (Fire and Forget)
      emailService.sendContactConfirmation(contact.email, contact.name)
        .catch(err => console.error('Error sending contact confirmation:', err));

      emailService.sendAdminContactNotification(contact)
        .catch(err => console.error('Error sending admin contact notification:', err));

      // Emit to admin dashboard
      const io = req.app.get('io');
      io.to('adminRoom').emit('newContactMessage', contact);

      res.status(201).json(contact);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/contact
// @desc    Get all contact messages
// @access  Admin
router.get('/', protectAdmin, async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: 'desc' });
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/contact/:id/respond
// @desc    Mark a message as responded
// @access  Admin
router.put('/:id/respond', protectAdmin, async (req, res) => {
  const { message: responseMessage } = req.body;

  if (!responseMessage || !responseMessage.trim()) {
    return res.status(400).json({ message: 'Response message is required' });
  }

  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await emailService.sendContactResponse(contact, req.user?.name, responseMessage.trim());

    contact.responded = true;
    contact.respondedAt = Date.now();
    contact.respondedBy = req.user?.name || 'Admin';
    contact.responseMessage = responseMessage.trim();

    await contact.save();

    const io = req.app.get('io');
    io.to('adminRoom').emit('updateContactMessage', contact);

    res.json(contact);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
