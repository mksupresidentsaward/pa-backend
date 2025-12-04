const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protectAdmin } = require('../middleware/authMiddleware');
const Event = require('../models/Event');

// @route   GET /api/events
// @desc    Get all events
// @access  Public
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ start: 'asc' });
    res.json(events);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events
// @desc    Create an event
// @access  Admin
router.post(
  '/',
  protectAdmin,
  [
    body('title', 'Title is required').not().isEmpty(),
    body('category', 'Category is required').not().isEmpty(),
    body('start', 'Start date is required').not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Convert start and end strings to Date objects if they're strings
      const eventData = {
        ...req.body,
        start: req.body.start ? new Date(req.body.start) : null,
        end: req.body.end ? new Date(req.body.end) : null,
      };

      if (!eventData.start || isNaN(eventData.start.getTime())) {
        return res.status(400).json({ message: 'Invalid start date format' });
      }

      const newEvent = new Event(eventData);

      const event = await newEvent.save();

      // Emit event to all connected clients
      const io = req.app.get('io');
      io.emit('newEvent', event);

      res.status(201).json(event);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/events/:id
// @desc    Update an event
// @access  Admin
router.put('/:id', protectAdmin, async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Convert start and end strings to Date objects if they're strings
    const updateData = { ...req.body };
    if (updateData.start && typeof updateData.start === 'string') {
      updateData.start = new Date(updateData.start);
      if (isNaN(updateData.start.getTime())) {
        return res.status(400).json({ message: 'Invalid start date format' });
      }
    }
    if (updateData.end && typeof updateData.end === 'string') {
      updateData.end = new Date(updateData.end);
      if (isNaN(updateData.end.getTime())) {
        return res.status(400).json({ message: 'Invalid end date format' });
      }
    }

    event = await Event.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });

    // Emit update event to all connected clients
    const io = req.app.get('io');
    io.emit('updateEvent', event);

    res.json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events/:id/register
// @desc    Register for an event
// @access  Public
router.post('/:id/register', [
  body('name', 'Name is required').not().isEmpty(),
  body('admissionNumber', 'Admission Number is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const { name, admissionNumber } = req.body;

    // Check if already registered (optional, but good practice)
    if (event.attendees.some(attendee => attendee.admissionNumber === admissionNumber)) {
      return res.status(400).json({ message: 'Student with this admission number is already registered' });
    }

    event.attendees.push({ name, admissionNumber });
    await event.save();

    // Emit update event to all connected clients (so admin dashboard updates live)
    const io = req.app.get('io');
    io.emit('updateEvent', event);

    res.json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Admin
router.delete('/:id', protectAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await Event.findByIdAndRemove(req.params.id);

    // Emit delete event to all connected clients
    const io = req.app.get('io');
    io.emit('deleteEvent', { id: req.params.id });

    res.json({ message: 'Event removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
