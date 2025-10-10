// server/routes/invoiceReceiving.js
import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { uploadInvoiceReceivingFiles, handleUploadError } from '../middleware/upload.js';
import {
  createInvoiceReceiving,
  getInvoiceReceiving,
  getInvoiceReceivings,
  updateInvoiceReceiving,
  submitToQC,
  performQCCheck,
  deleteInvoiceReceiving,
  downloadInvoiceReceivingPDF
} from '../controllers/invoiceReceivingController.js';

const router = express.Router();

// Validation rules - Modified to be less strict for updates
const invoiceValidation = [
  body('purchaseOrder').optional().isMongoId().withMessage('Valid purchase order ID required'),
  body('invoiceNumber').optional().notEmpty().withMessage('Invoice number required'),
  body('invoiceAmount').optional().isFloat({ min: 0 }).withMessage('Invoice amount must be positive'),
  body('products').optional().custom((value) => {
    // Handle both string (JSON) and array formats
    let productsArray;
    if (typeof value === 'string') {
      try {
        productsArray = JSON.parse(value);
      } catch (error) {
        throw new Error('Products must be valid JSON array');
      }
    } else if (Array.isArray(value)) {
      productsArray = value;
    } else {
      throw new Error('Products must be an array');
    }
    
    if (!Array.isArray(productsArray) || productsArray.length === 0) {
      throw new Error('At least one product required');
    }
    
    // Validate each product
    productsArray.forEach((product, index) => {
      if (product.product && !product.product.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error(`Product at index ${index} must have a valid product ID`);
      }
      // Check both receivedQuantity and receivedQty field names
      const receivedQty = product.receivedQuantity !== undefined ? product.receivedQuantity : product.receivedQty;
      if (receivedQty !== undefined && (isNaN(receivedQty) || receivedQty < 0)) {
        throw new Error(`Received quantity at index ${index} must be non-negative`);
      }
    });
    
    return true;
  }),
  body('receivedProducts').optional().custom((value) => {
    // Handle receivedProducts field name as well
    let productsArray;
    if (typeof value === 'string') {
      try {
        productsArray = JSON.parse(value);
      } catch (error) {
        throw new Error('Received products must be valid JSON array');
      }
    } else if (Array.isArray(value)) {
      productsArray = value;
    } else {
      throw new Error('Received products must be an array');
    }
    
    if (!Array.isArray(productsArray) || productsArray.length === 0) {
      throw new Error('At least one product required');
    }
    
    // Validate each product
    productsArray.forEach((product, index) => {
      if (product.product && !product.product.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error(`Product at index ${index} must have a valid product ID`);
      }
      // Check both receivedQuantity and receivedQty field names
      const receivedQty = product.receivedQuantity !== undefined ? product.receivedQuantity : product.receivedQty;
      if (receivedQty !== undefined && (isNaN(receivedQty) || receivedQty < 0)) {
        throw new Error(`Received quantity at index ${index} must be non-negative`);
      }
    });
    
    return true;
  })
];

// Routes
router.get('/', authenticate, checkPermission('invoice_receiving', 'view'), getInvoiceReceivings);
router.get('/:id', authenticate, checkPermission('invoice_receiving', 'view'), getInvoiceReceiving);

// Create with product images support
router.post('/', 
  authenticate, 
  checkPermission('invoice_receiving', 'create'),
  uploadInvoiceReceivingFiles,
  handleUploadError,
  invoiceValidation,
  validate,
  createInvoiceReceiving
);

// Update with product images support - Use different validation for updates
router.put('/:id', 
  authenticate, 
  checkPermission('invoice_receiving', 'update'),
  uploadInvoiceReceivingFiles,
  handleUploadError,
  // Skip validation for updates to allow partial updates
  updateInvoiceReceiving
);

router.delete('/:id', 
  authenticate, 
  checkPermission('invoice_receiving', 'delete'), 
  deleteInvoiceReceiving
);

router.post('/:id/submit-qc', 
  authenticate, 
  checkPermission('invoice_receiving', 'qc_submit'), 
  submitToQC
);

router.post('/:id/qc-check', 
  authenticate, 
  checkPermission('invoice_receiving', 'qc_check'), 
  performQCCheck
);

// PDF download route
router.get('/:id/download-pdf', 
  authenticate, 
  checkPermission('invoice_receiving', 'view'), 
  downloadInvoiceReceivingPDF
);

export default router;