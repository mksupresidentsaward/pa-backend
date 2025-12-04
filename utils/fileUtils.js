const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

/**
 * Sanitize filename to prevent directory traversal and special characters
 */
function sanitizeFilename(filename) {
  // Remove directory separators and dangerous characters
  const sanitized = filename
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
    .trim();
  
  // Generate unique filename if empty or too short
  if (!sanitized || sanitized.length < 3) {
    return uuidv4();
  }
  
  return sanitized;
}

/**
 * Generate unique filename with original extension
 */
function generateUniqueFilename(originalFilename) {
  const ext = path.extname(originalFilename);
  const baseName = path.basename(originalFilename, ext);
  const sanitized = sanitizeFilename(baseName);
  const uniqueId = uuidv4().substring(0, 8);
  return `${sanitized}-${uniqueId}${ext}`;
}

/**
 * Ensure directory exists, create if it doesn't
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Delete file safely
 */
async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
}

/**
 * Validate file type by MIME type
 */
function isValidFileType(mimetype, allowedTypes) {
  return allowedTypes.includes(mimetype);
}

/**
 * Validate file size
 */
function isValidFileSize(size, maxSizeBytes) {
  return size <= maxSizeBytes;
}

module.exports = {
  sanitizeFilename,
  generateUniqueFilename,
  ensureDirectoryExists,
  deleteFile,
  isValidFileType,
  isValidFileSize,
};

