// server/routes/files.js - Fixed download and view endpoints

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import { uploadSingleFile, handleUploadError } from '../middleware/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper function to find file in different directories
const findFilePath = (filename) => {
  const possiblePaths = [
    path.join(__dirname, '../uploads/hospital-documents', filename),
    path.join(__dirname, '../uploads/doctor-attachments', filename),
    path.join(__dirname, '../uploads/principal-documents', filename),
    path.join(__dirname, '../uploads/product-documents', filename),
    path.join(__dirname, '../uploads/invoice-receiving-images', filename),
  ];
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  
  return null;
};

// Upload file endpoint (keep as is)
router.post('/upload', authenticate, uploadSingleFile, handleUploadError, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `/api/files/download/${req.file.filename}`
    };

    res.json({
      message: 'File uploaded successfully',
      file: fileInfo
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Public image viewing endpoint - NO AUTHENTICATION REQUIRED
router.get('/public/view/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Find file in any of the upload directories
    const filePath = findFilePath(filename);
    
    // Check if file exists
    if (!filePath) {
      console.error('File not found for public viewing:', filename);
      return res.status(404).json({ message: 'File not found' });
    }

    const fileExtension = path.extname(filename).toLowerCase();
    
    // Only allow image files for public access
    let contentType = 'application/octet-stream';
    switch (fileExtension) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      default:
        // For non-image files, deny access
        return res.status(403).json({ message: 'File type not allowed for public access' });
    }

    // Get file stats
    const stats = fs.statSync(filePath);

    // Set headers for inline viewing with proper CORS
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error reading file' });
      }
    });

    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Public file view error:', error);
    res.status(500).json({ message: 'File view failed' });
  }
});

// Download file endpoint - FIXED
router.get('/download/:filename', authenticate, (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Find file in any of the upload directories
    const filePath = findFilePath(filename);
    
    // Check if file exists
    if (!filePath) {
      console.error('File not found:', filename);
      return res.status(404).json({ message: 'File not found' });
    }

    // Get file stats for metadata
    const stats = fs.statSync(filePath);
    const fileExtension = path.extname(filename).toLowerCase();
    
    // Set appropriate content type
    let contentType = 'application/octet-stream';
    switch (fileExtension) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case '.xls':
        contentType = 'application/vnd.ms-excel';
        break;
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.txt':
        contentType = 'text/plain';
        break;
    }

    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error reading file' });
      }
    });

    fileStream.pipe(res);
    
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ message: 'File download failed' });
  }
});

// View file endpoint - FIXED
router.get('/view/:filename', authenticate, (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Find file in any of the upload directories
    const filePath = findFilePath(filename);
    
    // Check if file exists
    if (!filePath) {
      console.error('File not found for viewing:', filename);
      return res.status(404).json({ message: 'File not found' });
    }

    const fileExtension = path.extname(filename).toLowerCase();
    
    // Set appropriate content type for viewing
    let contentType = 'application/octet-stream';
    switch (fileExtension) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      default:
        // For other file types, force download
        return res.redirect(`/api/files/download/${filename}`);
    }

    // Get file stats
    const stats = fs.statSync(filePath);

    // Set headers for inline viewing with proper CORS
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error reading file' });
      }
    });

    fileStream.pipe(res);
    
  } catch (error) {
    console.error('File view error:', error);
    res.status(500).json({ message: 'File view failed' });
  }
});

// Delete file endpoint - FIXED
router.delete('/:filename', authenticate, (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Find file in any of the upload directories
    const filePath = findFilePath(filename);
    
    // Check if file exists
    if (!filePath) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    res.json({ message: 'File deleted successfully' });
    
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({ message: 'File deletion failed' });
  }
});

// List files endpoint - FIXED
router.get('/', authenticate, (req, res) => {
  try {
    const allFiles = [];
    const uploadDirs = [
      { path: path.join(__dirname, '../uploads/hospital-documents'), type: 'hospital' },
      { path: path.join(__dirname, '../uploads/doctor-attachments'), type: 'doctor' },
      { path: path.join(__dirname, '../uploads/principal-documents'), type: 'principal' },
      { path: path.join(__dirname, '../uploads/product-documents'), type: 'product' },
      { path: path.join(__dirname, '../uploads/invoice-receiving-images'), type: 'invoice-receiving' }
    ];
    
    uploadDirs.forEach(dir => {
      if (fs.existsSync(dir.path)) {
        const files = fs.readdirSync(dir.path).map(filename => {
          const filePath = path.join(dir.path, filename);
          const stats = fs.statSync(filePath);
          
          return {
            filename,
            type: dir.type,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            downloadUrl: `/api/files/download/${filename}`,
            viewUrl: `/api/files/view/${filename}`
          };
        });
        allFiles.push(...files);
      }
    });

    res.json({ files: allFiles });
    
  } catch (error) {
    console.error('File list error:', error);
    res.status(500).json({ message: 'Failed to list files' });
  }
});

export default router;