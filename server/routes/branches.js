// server/routes/branches.js
import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { 
  uploadSingleFile, 
  uploadMultipleFiles, 
  uploadMixedFiles,
  uploadDocument, 
  handleUploadError 
} from '../middleware/upload.js';
import {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  addBranchDocument,
  updateBranchDocument,
  deleteBranchDocument,
  getBranchContacts,
  createBranchContact,
  updateBranchContact,
  deleteBranchContact,
} from '../controllers/branchController.js';

const router = express.Router();

// Validation rules for branch
const branchValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Branch name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone number required'),
  body('drugLicenseNumber').trim().isLength({ min: 1 }).withMessage('Drug license number is required'),
  body('gstNumber').trim().isLength({ min: 15, max: 15 }).withMessage('GST number must be exactly 15 characters'),
  body('panNumber').trim().isLength({ min: 10, max: 10 }).withMessage('PAN number must be exactly 10 characters'),
  body('gstAddress').trim().isLength({ min: 10 }).withMessage('GST address must be at least 10 characters'),
  body('city').trim().isLength({ min: 2 }).withMessage('City must be at least 2 characters'),
  body('state').isMongoId().withMessage('Valid state ID required'),
  body('pincode').trim().isLength({ min: 6, max: 6 }).withMessage('Pincode must be exactly 6 digits'),
];

// Validation rules for branch contact
const contactValidation = [
  body('contactPersonName').trim().isLength({ min: 2 }).withMessage('Contact person name must be at least 2 characters'),
  body('department').isIn(['Admin', 'Operations', 'Sales', 'Logistics']).withMessage('Invalid department'),
  body('designation').trim().isLength({ min: 2 }).withMessage('Designation must be at least 2 characters'),
  body('contactNumber').trim().isLength({ min: 10 }).withMessage('Valid contact number required'),
  body('emailAddress').isEmail().normalizeEmail().withMessage('Valid email required'),
];

// Document validation
const documentValidation = [
  body('documentName').trim().isLength({ min: 1 }).withMessage('Document name is required'),
  body('validityStartDate').isISO8601().withMessage('Valid start date required'),
  body('validityEndDate').isISO8601().withMessage('Valid end date required'),
];

// Branch routes
router.get('/', authenticate, checkPermission('branches', 'view'), getBranches);
router.get('/:id', authenticate, checkPermission('branches', 'view'), getBranch);

// Create branch with document uploads
router.post('/', 
  authenticate, 
  checkPermission('branches', 'create'),
  uploadMixedFiles, // Support multiple document uploads
  handleUploadError,
  branchValidation, 
  validate, 
  createBranch
);

// Update branch with document uploads
router.put('/:id', 
  authenticate, 
  checkPermission('branches', 'update'),
  uploadMixedFiles, // Support multiple document uploads
  handleUploadError,
  branchValidation, 
  validate, 
  updateBranch
);

router.delete('/:id', authenticate, checkPermission('branches', 'delete'), deleteBranch);

// Document management routes
router.post('/:id/documents', 
  authenticate, 
  checkPermission('branches', 'update'),
  uploadDocument,
  handleUploadError,
  documentValidation,
  validate,
  addBranchDocument
);

router.put('/:id/documents/:documentId', 
  authenticate, 
  checkPermission('branches', 'update'),
  documentValidation,
  validate,
  updateBranchDocument
);

router.delete('/:id/documents/:documentId', 
  authenticate, 
  checkPermission('branches', 'update'), 
  deleteBranchDocument
);

// Contact management routes
router.get('/:id/contacts', authenticate, checkPermission('branches', 'view'), getBranchContacts);
router.post('/:id/contacts', authenticate, checkPermission('branches', 'create'), contactValidation, validate, createBranchContact);
router.put('/:id/contacts/:contactId', authenticate, checkPermission('branches', 'update'), contactValidation, validate, updateBranchContact);
router.delete('/:id/contacts/:contactId', authenticate, checkPermission('branches', 'delete'), deleteBranchContact);

export default router;