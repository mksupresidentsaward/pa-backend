const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  start: {
    type: Date,
    required: true,
  },
  end: {
    type: Date,
  },
  location: {
    type: String,
  },
  description: {
    type: String,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  imageUrl: {
    type: String,
  },
  attendees: [{
    name: {
      type: String,
      required: true
    },
    admissionNumber: {
      type: String,
      required: true
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Event', EventSchema);
