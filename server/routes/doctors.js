// server/routes/doctors.js
import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { 
  uploadDocument, 
  uploadMixedFiles,
  handleUploadError 
} from '../middleware/upload.js';
import {
  getDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  addDoctorAttachment,
  deleteDoctorAttachment,
} from '../controllers/doctorController.js';

const router = express.Router();

// Validation rules for doctor
const doctorValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Doctor name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone number required'),
  body('location').trim().isLength({ min: 2 }).withMessage('Location must be at least 2 characters'),
  body('portfolio')  // Changed from specialization
    .custom((value, { req }) => {
      // Handle both string and array formats from FormData
      const portfolios = Array.isArray(value) ? value : (value ? [value] : []);
      return portfolios.length > 0;
    })
    .withMessage('At least one portfolio is required'),
  body('hospitals')
    .custom((value, { req }) => {
      // Handle both string and array formats from FormData
      const hosps = Array.isArray(value) ? value : (value ? [value] : []);
      return hosps.length > 0;
    })
    .withMessage('At least one hospital is required'),
  body('targets').optional().custom((value) => {
    // If targets is a string, try to parse it as JSON
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
        return true;
      } catch (e) {
        return false;
      }
    }
    return Array.isArray(value) || value === undefined;
  }).withMessage('Targets must be a valid array'),
];

// Attachment validation
const attachmentValidation = [
  body('fileType').optional().isIn(['license', 'certificate', 'degree', 'cv', 'other']).withMessage('Invalid file type'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
];

// Doctor routes
router.get('/', authenticate, checkPermission('doctors', 'view'), getDoctors);
router.get('/:id', authenticate, checkPermission('doctors', 'view'), getDoctor);

// Create doctor with file upload support
router.post('/', 
  authenticate, 
  checkPermission('doctors', 'create'),
  uploadMixedFiles, // Support multiple attachments
  handleUploadError,
  doctorValidation, 
  validate, 
  createDoctor
);

// Update doctor with file upload support
router.put('/:id', 
  authenticate, 
  checkPermission('doctors', 'update'),
  uploadMixedFiles, // Support multiple attachments
  handleUploadError,
  doctorValidation, 
  validate, 
  updateDoctor
);

router.delete('/:id', authenticate, checkPermission('doctors', 'delete'), deleteDoctor);

// Attachment management routes
router.post('/:id/attachments', 
  authenticate, 
  checkPermission('doctors', 'update'),
  uploadDocument,
  handleUploadError,
  attachmentValidation,
  validate,
  addDoctorAttachment
);

router.delete('/:id/attachments/:attachmentId', 
  authenticate, 
  checkPermission('doctors', 'update'), 
  deleteDoctorAttachment
);

export default router;