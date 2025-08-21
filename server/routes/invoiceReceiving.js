// server/routes/invoiceReceiving.js
import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { uploadMixedFiles, handleUploadError } from '../middleware/upload.js';
import {
  createInvoiceReceiving,
  submitToQC,
  performQCCheck,
  getInvoiceReceivings
} from '../controllers/invoiceReceivingController.js';

const router = express.Router();

// Validation rules
const invoiceValidation = [
  body('purchaseOrder').isMongoId().withMessage('Valid purchase order ID required'),
  body('invoiceNumber').notEmpty().withMessage('Invoice number required'),
  body('invoiceAmount').isFloat({ min: 0 }).withMessage('Invoice amount must be positive'),
  body('products').isArray({ min: 1 }).withMessage('At least one product required'),
  body('products.*.product').isMongoId().withMessage('Valid product ID required'),
  body('products.*.receivedQty').isInt({ min: 0 }).withMessage('Received quantity must be non-negative')
];

// Routes
router.get('/', authenticate, checkPermission('po_receiving', 'receive'), getInvoiceReceivings);

router.post('/', 
  authenticate, 
  checkPermission('po_receiving', 'receive'),
  uploadMixedFiles,
  handleUploadError,
  invoiceValidation,
  validate,
  createInvoiceReceiving
);

router.post('/:id/submit-qc', 
  authenticate, 
  checkPermission('po_receiving', 'receive'), 
  submitToQC
);

router.post('/:id/qc-check', 
  authenticate, 
  checkPermission('po_receiving', 'qc_check'), 
  performQCCheck
);

export default router;