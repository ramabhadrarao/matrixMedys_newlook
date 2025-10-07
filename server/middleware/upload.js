// server/middleware/upload.js - Updated for principal documents
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, '../uploads');
const hospitalDocsDir = path.join(uploadsDir, 'hospital-documents');
const doctorAttachmentsDir = path.join(uploadsDir, 'doctor-attachments');
const principalDocsDir = path.join(uploadsDir, 'principal-documents');
const productDocsDir = path.join(uploadsDir, 'product-documents');
const invoiceReceivingImagesDir = path.join(uploadsDir, 'invoice-receiving-images');

[uploadsDir, hospitalDocsDir, doctorAttachmentsDir, principalDocsDir, productDocsDir, invoiceReceivingImagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer storage for different file types
const createStorage = (uploadPath) => multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'text/plain'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, and TXT files are allowed.'), false);
  }
};

// Image-only file filter for product images
const imageFilter = (req, file, cb) => {
  const allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];
  
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, and PNG images are allowed.'), false);
  }
};

// Configure multer for different upload scenarios
const hospitalStorage = createStorage(hospitalDocsDir);
const doctorStorage = createStorage(doctorAttachmentsDir);
const principalStorage = createStorage(principalDocsDir);
const productStorage = createStorage(productDocsDir);
const invoiceReceivingImagesStorage = createStorage(invoiceReceivingImagesDir);
// Hospital file uploads
const uploadHospitalSingle = multer({
  storage: hospitalStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

const uploadHospitalMultiple = multer({
  storage: hospitalStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10, // Maximum 10 files
  }
});

// Doctor file uploads
const uploadDoctorSingle = multer({
  storage: doctorStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

const uploadDoctorMultiple = multer({
  storage: doctorStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 15, // Maximum 15 files for doctors
  }
});

// Principal file uploads
const uploadPrincipalSingle = multer({
  storage: principalStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

const uploadPrincipalMultiple = multer({
  storage: principalStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 20, // Maximum 20 files for principals
  }
});
const uploadProductSingle = multer({
  storage: productStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});
const uploadProductMultiple = multer({
  storage: productStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10, // Maximum 10 files for products
  }
});
// Generic storage (auto-detects based on route)
// Update getUploadPath function
const getUploadPath = (req) => {
  if (req.route?.path?.includes('products') || req.originalUrl?.includes('products')) {
    return productDocsDir;
  } else if (req.route?.path?.includes('principals') || req.originalUrl?.includes('principals')) {
    return principalDocsDir;
  } else if (req.route?.path?.includes('doctors') || req.originalUrl?.includes('doctors')) {
    return doctorAttachmentsDir;
  } else if (req.route?.path?.includes('hospitals') || req.originalUrl?.includes('hospitals')) {
    return hospitalDocsDir;
  }
  return hospitalDocsDir; // Default
};

const dynamicStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = getUploadPath(req);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

const uploadDynamic = multer({
  storage: dynamicStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 20, // Maximum 20 files
  }
});

// Middleware exports
export const uploadSingleFile = uploadHospitalSingle.single('agreementFile');
export const uploadMultipleFiles = uploadHospitalMultiple.array('documents', 10);
export const uploadMixedFiles = uploadDynamic.fields([
  { name: 'agreementFile', maxCount: 1 },
  { name: 'documents', maxCount: 20 },
  { name: 'attachments', maxCount: 15 }
]);
export const uploadDocument = uploadDynamic.single('document');

// Doctor-specific uploads
export const uploadDoctorAttachment = uploadDoctorSingle.single('attachment');
export const uploadDoctorAttachments = uploadDoctorMultiple.array('attachments', 15);

// Principal-specific uploads
export const uploadPrincipalDocument = uploadPrincipalSingle.single('document');
export const uploadPrincipalDocuments = uploadPrincipalMultiple.array('documents', 20);

// Export product uploads
export const uploadProductDocument = uploadProductSingle.single('document');
export const uploadProductDocuments = uploadProductMultiple.array('documents', 10);

// Invoice receiving product images uploads
const uploadInvoiceReceivingImages = multer({
  storage: invoiceReceivingImagesStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per image
    files: 10, // Maximum 10 images per product
  }
});

export const uploadProductImages = uploadInvoiceReceivingImages.array('productImages', 10);
// Error handler middleware
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large. Maximum size is 10MB per file.' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        message: 'Too many files. Maximum 20 files allowed.' 
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        message: 'Unexpected file field.' 
      });
    }
  }
  
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ message: err.message });
  }
  
  return res.status(500).json({ 
    message: 'File upload error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
};

export default {
  uploadSingle: uploadSingleFile,
  uploadMultiple: uploadMultipleFiles,
  uploadMixed: uploadMixedFiles,
  uploadDocument: uploadDocument,
  uploadDoctorAttachment: uploadDoctorAttachment,
  uploadDoctorAttachments: uploadDoctorAttachments,
  uploadPrincipalDocument: uploadPrincipalDocument,
  uploadPrincipalDocuments: uploadPrincipalDocuments,
  handleError: handleUploadError
};