// server/routes/invoiceReceiving.js - FIXED VERSION
import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { uploadMixedFiles, handleUploadError } from '../middleware/upload.js';
import {
  createInvoiceReceiving,
  getInvoiceReceiving,
  getInvoiceReceivings,
  updateInvoiceReceiving,
  submitToQC,
  performQCCheck,
  updateQCStatus
} from '../controllers/invoiceReceivingController.js';

const router = express.Router();

// Validation rules
const invoiceValidation = [
  body('purchaseOrder').isMongoId().withMessage('Valid purchase order ID required'),
  body('invoiceNumber').notEmpty().withMessage('Invoice number required'),
  body('receivedProducts').custom((value, { req }) => {
    let products = value;
    
    // Handle string format (from FormData)
    if (typeof value === 'string') {
      try {
        products = JSON.parse(value);
      } catch (e) {
        throw new Error('Invalid products format');
      }
    }
    
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('At least one received product is required');
    }
    
    return true;
  })
];

const updateInvoiceValidation = [
  body('purchaseOrder').optional().isMongoId().withMessage('Valid purchase order ID required'),
  body('invoiceNumber').optional().notEmpty().withMessage('Invoice number required'),
  body('receivedProducts').optional().custom((value, { req }) => {
    let products = value;
    
    if (typeof value === 'string') {
      try {
        products = JSON.parse(value);
      } catch (e) {
        throw new Error('Invalid products format');
      }
    }
    
    if (products && (!Array.isArray(products) || products.length === 0)) {
      throw new Error('At least one received product is required');
    }
    
    return true;
  })
];

const qcValidation = [
  body('qcStatus').isIn(['passed', 'failed', 'partial']).withMessage('Valid QC status required'),
  body('qcRemarks').optional().isString().withMessage('QC remarks must be a string'),
  body('productQCResults').optional().isArray().withMessage('Product QC results must be an array')
];

// Routes
// Get all invoice receivings
router.get('/', 
  authenticate, 
  checkPermission('invoice_receiving', 'view'), 
  getInvoiceReceivings
);

// Get single invoice receiving
router.get('/:id', 
  authenticate, 
  checkPermission('invoice_receiving', 'view'), 
  getInvoiceReceiving
);

// Create new invoice receiving
router.post('/', 
  authenticate, 
  checkPermission('invoice_receiving', 'create'),
  uploadMixedFiles,
  handleUploadError,
  invoiceValidation,
  validate,
  createInvoiceReceiving
);

// Update invoice receiving
router.put('/:id', 
  authenticate, 
  checkPermission('invoice_receiving', 'update'),
  uploadMixedFiles,
  handleUploadError,
  updateInvoiceValidation,
  validate,
  updateInvoiceReceiving
);

// Submit to QC
router.post('/:id/submit-qc', 
  authenticate, 
  checkPermission('invoice_receiving', 'qc_submit'), 
  submitToQC
);

// Perform QC check
router.post('/:id/qc-check', 
  authenticate, 
  checkPermission('invoice_receiving', 'qc_check'), 
  qcValidation,
  validate,
  performQCCheck
);

// Update individual product QC status
router.put('/:id/qc-status', 
  authenticate, 
  checkPermission('invoice_receiving', 'qc_check'),
  [
    body('productIndex').isInt({ min: 0 }).withMessage('Valid product index required'),
    body('qcStatus').isIn(['passed', 'failed', 'pending']).withMessage('Valid QC status required'),
    body('qcRemarks').optional().isString().withMessage('QC remarks must be a string')
  ],
  validate,
  updateQCStatus
);

export default router;