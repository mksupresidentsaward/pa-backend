const mongoose = require('mongoose');

const GalleryImageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['adventure', 'service', 'training', 'ceremony'],
  },
  filename: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  uploadedBy: {
    type: String,
    required: true,
  },
  uploadedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries
GalleryImageSchema.index({ category: 1, createdAt: -1 });
GalleryImageSchema.index({ uploadedById: 1, createdAt: -1 });

module.exports = mongoose.model('GalleryImage', GalleryImageSchema);

