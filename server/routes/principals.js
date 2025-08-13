// server/routes/principals.js
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
  getPrincipals,
  getPrincipal,
  createPrincipal,
  updatePrincipal,
  deletePrincipal,
  addPrincipalAddress,
  updatePrincipalAddress,
  deletePrincipalAddress,
  addPrincipalDocument,
  updatePrincipalDocument,
  deletePrincipalDocument,
  addPrincipalContact,
  updatePrincipalContact,
  deletePrincipalContact,
  getPrincipalStats,
} from '../controllers/principalController.js';

const router = express.Router();

// Validation rules for principal
const principalValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Principal name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('mobile').trim().isLength({ min: 10 }).withMessage('Valid mobile number required'),
  body('gstNumber')
    .trim()
    .isLength({ min: 15, max: 15 })
    .toUpperCase()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GST number format'),
  body('panNumber')
    .trim()
    .isLength({ min: 10, max: 10 })
    .toUpperCase()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Invalid PAN number format (should be like ABCDE1234F)'),
  body('portfolio')
    .custom((value, { req }) => {
      const portfolios = Array.isArray(value) ? value : (value ? [value] : []);
      return portfolios.length > 0;
    })
    .withMessage('At least one portfolio is required'),
];

// Address validation
const addressValidation = [
  body('title').trim().isLength({ min: 2 }).withMessage('Address title must be at least 2 characters'),
  body('city').trim().isLength({ min: 2 }).withMessage('City must be at least 2 characters'),
  body('state').isMongoId().withMessage('Valid state ID required'),
  body('pincode').trim().isLength({ min: 6, max: 6 }).withMessage('Pincode must be exactly 6 digits'),
];

// Document validation
const documentValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Document name must be at least 2 characters'),
  body('hasValidity').optional().isBoolean().withMessage('Has validity must be boolean'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (req.body.hasValidity && req.body.startDate) {
        return new Date(endDate) > new Date(req.body.startDate);
      }
      return true;
    })
    .withMessage('End date must be after start date'),
];

// Contact person validation
const contactValidation = [
  body('portfolio').optional().isMongoId().withMessage('Valid portfolio ID required'),
  body('departmentName').trim().isLength({ min: 2 }).withMessage('Department name must be at least 2 characters'),
  body('personName').trim().isLength({ min: 2 }).withMessage('Person name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('mobile').trim().isLength({ min: 10 }).withMessage('Valid mobile number required'),
  body('address').optional().trim(),
  body('location').trim().isLength({ min: 2 }).withMessage('Location must be at least 2 characters'),
  body('pincode').trim().isLength({ min: 6, max: 6 }).withMessage('Pincode must be exactly 6 digits'),
];

// Principal routes
router.get('/', authenticate, checkPermission('principals', 'view'), getPrincipals);
router.get('/stats', authenticate, checkPermission('principals', 'view'), getPrincipalStats);
router.get('/:id', authenticate, checkPermission('principals', 'view'), getPrincipal);

// Create principal with file upload support
router.post('/', 
  authenticate, 
  checkPermission('principals', 'create'),
  uploadMixedFiles, // Support multiple documents
  handleUploadError,
  principalValidation, 
  validate, 
  createPrincipal
);

// Update principal with file upload support
router.put('/:id', 
  authenticate, 
  checkPermission('principals', 'update'),
  uploadMixedFiles, // Support multiple documents
  handleUploadError,
  principalValidation, 
  validate, 
  updatePrincipal
);

router.delete('/:id', authenticate, checkPermission('principals', 'delete'), deletePrincipal);

// Address management routes
router.post('/:id/addresses', 
  authenticate, 
  checkPermission('principals', 'update'),
  addressValidation,
  validate,
  addPrincipalAddress
);

router.put('/:id/addresses/:addressId', 
  authenticate, 
  checkPermission('principals', 'update'),
  addressValidation,
  validate,
  updatePrincipalAddress
);

router.delete('/:id/addresses/:addressId', 
  authenticate, 
  checkPermission('principals', 'update'), 
  deletePrincipalAddress
);

// Document management routes
router.post('/:id/documents', 
  authenticate, 
  checkPermission('principals', 'update'),
  uploadDocument,
  handleUploadError,
  documentValidation,
  validate,
  addPrincipalDocument
);

router.put('/:id/documents/:documentId', 
  authenticate, 
  checkPermission('principals', 'update'),
  documentValidation,
  validate,
  updatePrincipalDocument
);

router.delete('/:id/documents/:documentId', 
  authenticate, 
  checkPermission('principals', 'update'), 
  deletePrincipalDocument
);

// Contact person management routes
router.post('/:id/contacts', 
  authenticate, 
  checkPermission('principals', 'update'),
  contactValidation,
  validate,
  addPrincipalContact
);

router.put('/:id/contacts/:contactId', 
  authenticate, 
  checkPermission('principals', 'update'),
  contactValidation,
  validate,
  updatePrincipalContact
);

router.delete('/:id/contacts/:contactId', 
  authenticate, 
  checkPermission('principals', 'update'), 
  deletePrincipalContact
);

export default router;