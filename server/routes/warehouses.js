// server/routes/warehouses.js
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
  getWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  addWarehouseDocument,
  updateWarehouseDocument,
  deleteWarehouseDocument,
  getWarehouseContacts,
  createWarehouseContact,
  getWarehousesByBranch,
} from '../controllers/warehouseController.js';
import {
  updateBranchContact,
  deleteBranchContact,
} from '../controllers/branchController.js';

const router = express.Router();

// Validation rules for warehouse
const warehouseValidation = [
  body('branch').isMongoId().withMessage('Valid branch ID required'),
  body('name').trim().isLength({ min: 2 }).withMessage('Warehouse name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone number required'),
  body('address').trim().isLength({ min: 10 }).withMessage('Address must be at least 10 characters'),
  body('drugLicenseNumber').trim().isLength({ min: 1 }).withMessage('Drug license number is required'),
  body('district').trim().isLength({ min: 2 }).withMessage('District must be at least 2 characters'),
  body('state').isMongoId().withMessage('Valid state ID required'),
  body('pincode').trim().isLength({ min: 6, max: 6 }).withMessage('Pincode must be exactly 6 digits'),
  body('status').optional().isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive'),
];

// Validation rules for warehouse contact
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

// Warehouse routes
router.get('/', authenticate, checkPermission('warehouses', 'view'), getWarehouses);
router.get('/:id', authenticate, checkPermission('warehouses', 'view'), getWarehouse);

// Get warehouses by branch
router.get('/branch/:branchId', authenticate, checkPermission('warehouses', 'view'), getWarehousesByBranch);

// Create warehouse with document uploads
router.post('/', 
  authenticate, 
  checkPermission('warehouses', 'create'),
  uploadMixedFiles, // Support multiple document uploads
  handleUploadError,
  warehouseValidation, 
  validate, 
  createWarehouse
);

// Update warehouse with document uploads
router.put('/:id', 
  authenticate, 
  checkPermission('warehouses', 'update'),
  uploadMixedFiles, // Support multiple document uploads
  handleUploadError,
  warehouseValidation, 
  validate, 
  updateWarehouse
);

router.delete('/:id', authenticate, checkPermission('warehouses', 'delete'), deleteWarehouse);

// Document management routes
router.post('/:id/documents', 
  authenticate, 
  checkPermission('warehouses', 'update'),
  uploadDocument,
  handleUploadError,
  documentValidation,
  validate,
  addWarehouseDocument
);

router.put('/:id/documents/:documentId', 
  authenticate, 
  checkPermission('warehouses', 'update'),
  documentValidation,
  validate,
  updateWarehouseDocument
);

router.delete('/:id/documents/:documentId', 
  authenticate, 
  checkPermission('warehouses', 'update'), 
  deleteWarehouseDocument
);

// Contact management routes
router.get('/:id/contacts', authenticate, checkPermission('warehouses', 'view'), getWarehouseContacts);
router.post('/:id/contacts', authenticate, checkPermission('warehouses', 'create'), contactValidation, validate, createWarehouseContact);
router.put('/:id/contacts/:contactId', authenticate, checkPermission('warehouses', 'update'), contactValidation, validate, updateBranchContact);
router.delete('/:id/contacts/:contactId', authenticate, checkPermission('warehouses', 'delete'), deleteBranchContact);

export default router;