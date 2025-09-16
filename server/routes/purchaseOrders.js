// server/routes/purchaseOrders.js
import express from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  submitForApproval,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  cancelPurchaseOrder,
  deletePurchaseOrder,
  getNextPONumber,
  validatePONumber,
  getPurchaseOrderStats,
  sendPurchaseOrderEmail
} from '../controllers/purchaseOrderController.js';

const router = express.Router();

// Validation rules
const purchaseOrderValidation = [
  body('principal').isMongoId().withMessage('Valid principal ID required'),
  body('billTo.branchWarehouse').notEmpty().withMessage('Bill to branch/warehouse required'),
  body('billTo.name').notEmpty().withMessage('Bill to name required'),
  body('billTo.address').notEmpty().withMessage('Bill to address required'),
  body('shipTo.branchWarehouse').notEmpty().withMessage('Ship to branch/warehouse required'),
  body('shipTo.name').notEmpty().withMessage('Ship to name required'),
  body('shipTo.address').notEmpty().withMessage('Ship to address required'),
  body('products').isArray({ min: 1 }).withMessage('At least one product required'),
  body('products.*.product').isMongoId().withMessage('Valid product ID required'),
  body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('products.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be positive'),
  body('products.*.foc').optional().isInt({ min: 0 }).withMessage('FOC must be positive'),
  body('products.*.discount').optional().isFloat({ min: 0 }).withMessage('Discount must be positive'),
  body('products.*.discountType').optional().isIn(['percentage', 'amount']).withMessage('Discount type must be percentage or amount'),
  body('products.*.gstRate').optional().isFloat({ min: 0, max: 100 }).withMessage('GST rate must be between 0 and 100'),
  body('gstRate').optional().isFloat({ min: 0, max: 100 }).withMessage('GST rate must be between 0 and 100'),
  body('taxType').optional().isIn(['IGST', 'CGST_SGST']).withMessage('Tax type must be IGST or CGST_SGST'),
  body('additionalDiscount.type').optional().isIn(['percentage', 'amount']).withMessage('Additional discount type must be percentage or amount'),
  body('additionalDiscount.value').optional().isFloat({ min: 0 }).withMessage('Additional discount value must be positive'),
  body('shippingCharges.type').optional().isIn(['percentage', 'amount']).withMessage('Shipping charges type must be percentage or amount'),
  body('shippingCharges.value').optional().isFloat({ min: 0 }).withMessage('Shipping charges value must be positive'),
  body('toEmails.*').optional().isEmail().withMessage('Invalid email format'),
  body('fromEmail').optional().isEmail().withMessage('Invalid from email format'),
  body('ccEmails.*').optional().isEmail().withMessage('Invalid CC email format')
];

const updatePurchaseOrderValidation = [
  body('principal').optional().isMongoId().withMessage('Valid principal ID required'),
  body('billTo.branchWarehouse').optional().notEmpty().withMessage('Bill to branch/warehouse required'),
  body('billTo.name').optional().notEmpty().withMessage('Bill to name required'),
  body('billTo.address').optional().notEmpty().withMessage('Bill to address required'),
  body('shipTo.branchWarehouse').optional().notEmpty().withMessage('Ship to branch/warehouse required'),
  body('shipTo.name').optional().notEmpty().withMessage('Ship to name required'),
  body('shipTo.address').optional().notEmpty().withMessage('Ship to address required'),
  body('products').optional().isArray({ min: 1 }).withMessage('At least one product required'),
  body('products.*.product').optional().isMongoId().withMessage('Valid product ID required'),
  body('products.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('products.*.unitPrice').optional().isFloat({ min: 0 }).withMessage('Unit price must be positive'),
  body('products.*.foc').optional().isInt({ min: 0 }).withMessage('FOC must be positive'),
  body('products.*.discount').optional().isFloat({ min: 0 }).withMessage('Discount must be positive'),
  body('products.*.discountType').optional().isIn(['percentage', 'amount']).withMessage('Discount type must be percentage or amount'),
  body('products.*.gstRate').optional().isFloat({ min: 0, max: 100 }).withMessage('GST rate must be between 0 and 100'),
  body('gstRate').optional().isFloat({ min: 0, max: 100 }).withMessage('GST rate must be between 0 and 100'),
  body('taxType').optional().isIn(['IGST', 'CGST_SGST']).withMessage('Tax type must be IGST or CGST_SGST'),
  body('additionalDiscount.type').optional().isIn(['percentage', 'amount']).withMessage('Additional discount type must be percentage or amount'),
  body('additionalDiscount.value').optional().isFloat({ min: 0 }).withMessage('Additional discount value must be positive'),
  body('shippingCharges.type').optional().isIn(['percentage', 'amount']).withMessage('Shipping charges type must be percentage or amount'),
  body('shippingCharges.value').optional().isFloat({ min: 0 }).withMessage('Shipping charges value must be positive'),
  body('toEmails.*').optional().isEmail().withMessage('Invalid email format'),
  body('fromEmail').optional().isEmail().withMessage('Invalid from email format'),
  body('ccEmails.*').optional().isEmail().withMessage('Invalid CC email format')
];

const workflowActionValidation = [
  body('remarks').optional().isString().withMessage('Remarks must be a string')
];

const rejectValidation = [
  body('remarks').notEmpty().withMessage('Remarks are required for rejection')
];

const nextPONumberValidation = [
  query('principalId').isMongoId().withMessage('Valid principal ID required'),
  query('date').optional().isISO8601().withMessage('Valid date required')
];

const validatePONumberValidation = [
  body('poNumber').notEmpty().withMessage('PO number is required'),
  body('principalId').optional().isMongoId().withMessage('Valid principal ID required')
];

const emailValidation = [
  body('recipients').optional().isArray().withMessage('Recipients must be an array'),
  body('recipients.*').optional().isEmail().withMessage('Invalid recipient email format'),
  body('subject').optional().isString().withMessage('Subject must be a string'),
  body('message').optional().isString().withMessage('Message must be a string')
];

const statsValidation = [
  query('fromDate').optional().isISO8601().withMessage('Valid from date required'),
  query('toDate').optional().isISO8601().withMessage('Valid to date required'),
  query('principal').optional().isMongoId().withMessage('Valid principal ID required')
];

// ===== MAIN CRUD ROUTES =====

// Get all purchase orders with filtering
router.get('/', 
  authenticate, 
  checkPermission('purchase_orders', 'view'), 
  getPurchaseOrders
);

// Get single purchase order
router.get('/:id', 
  authenticate, 
  checkPermission('purchase_orders', 'view'), 
  getPurchaseOrder
);

// Create purchase order
router.post('/', 
  authenticate, 
  checkPermission('purchase_orders', 'create'), 
  purchaseOrderValidation, 
  validate, 
  createPurchaseOrder
);

// Update purchase order
router.put('/:id', 
  authenticate, 
  checkPermission('purchase_orders', 'update'), 
  updatePurchaseOrderValidation, 
  validate, 
  updatePurchaseOrder
);

// Delete purchase order (only draft)
router.delete('/:id', 
  authenticate, 
  checkPermission('purchase_orders', 'delete'), 
  deletePurchaseOrder
);

// ===== WORKFLOW ACTION ROUTES =====

// Submit purchase order for approval
router.post('/:id/submit-for-approval', 
  authenticate, 
  checkPermission('po_workflow', 'submit'), 
  workflowActionValidation, 
  validate, 
  submitForApproval
);

// Approve purchase order
router.post('/:id/approve', 
  authenticate, 
  checkPermission('po_workflow', 'approve_level1'), 
  workflowActionValidation, 
  validate, 
  approvePurchaseOrder
);

// Reject purchase order
router.post('/:id/reject', 
  authenticate, 
  checkPermission('po_workflow', 'reject'), 
  rejectValidation, 
  validate, 
  rejectPurchaseOrder
);

// Cancel purchase order
router.post('/:id/cancel', 
  authenticate, 
  checkPermission('po_workflow', 'cancel'), 
  workflowActionValidation, 
  validate, 
  cancelPurchaseOrder
);

// ===== UTILITY ROUTES =====

// Get next PO number preview
router.get('/utils/next-po-number', 
  authenticate, 
  checkPermission('purchase_orders', 'create'), 
  nextPONumberValidation, 
  validate, 
  getNextPONumber
);

// Validate PO number
router.post('/utils/validate-po-number', 
  authenticate, 
  checkPermission('purchase_orders', 'create'), 
  validatePONumberValidation, 
  validate, 
  validatePONumber
);

// Get purchase order statistics
router.get('/stats/dashboard', 
  authenticate, 
  checkPermission('purchase_orders', 'view'), 
  statsValidation, 
  validate, 
  getPurchaseOrderStats
);

// ===== EMAIL ROUTES =====

// Send purchase order via email
router.post('/:id/send-email', 
  authenticate, 
  checkPermission('po_workflow', 'send'), 
  emailValidation, 
  validate, 
  sendPurchaseOrderEmail
);

export default router;