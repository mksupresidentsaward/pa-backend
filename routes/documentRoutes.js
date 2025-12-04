const express = require('express');
const router = express.Router();
const path = require('path');
const { protectAdmin } = require('../middleware/authMiddleware');
const { uploadDocument, validateFileSize, MAX_DOCUMENT_SIZE } = require('../middleware/uploadMiddleware');
const Document = require('../models/Document');
const { deleteFile } = require('../utils/fileUtils');

// @route   POST /api/documents/upload
// @desc    Upload a document (Admin only)
// @access  Admin
router.post(
  '/upload',
  protectAdmin,
  uploadDocument.single('document'),
  validateFileSize(MAX_DOCUMENT_SIZE),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const document = new Document({
        title: req.body.title || req.file.originalname,
        filename: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user.name,
        uploadedById: req.user._id,
      });

      await document.save();

      res.status(201).json({
        _id: document._id,
        title: document.title,
        filename: document.filename,
        filePath: `/uploads/documents/${document.filename}`,
        fileSize: document.fileSize,
        uploadedBy: document.uploadedBy,
        createdAt: document.createdAt,
      });
    } catch (err) {
      console.error('Document upload error:', err);
      // Clean up uploaded file on error
      if (req.file) {
        await deleteFile(req.file.path);
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/documents
// @desc    Get all documents (Public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const documents = await Document.find()
      .select('title filename fileSize uploadedBy createdAt')
      .sort({ createdAt: 'desc' });

    const documentsWithUrls = documents.map((doc) => ({
      _id: doc._id,
      title: doc.title,
      filename: doc.filename,
      downloadUrl: `/uploads/documents/${doc.filename}`,
      fileSize: doc.fileSize,
      uploadedBy: doc.uploadedBy,
      createdAt: doc.createdAt,
    }));

    res.json(documentsWithUrls);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete a document (Admin only)
// @access  Admin
router.delete('/:id', protectAdmin, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Only allow deletion by the uploader or super admin
    if (document.uploadedById.toString() !== req.user._id.toString() && !req.user.superAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }

    // Delete file from filesystem
    await deleteFile(document.filePath);

    // Delete from database
    await Document.findByIdAndDelete(req.params.id);

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

