// server/routes/purchaseOrders.js
import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  deletePurchaseOrder
} from '../controllers/purchaseOrderController.js';

const router = express.Router();

// Validation rules
const purchaseOrderValidation = [
  body('principal').isMongoId().withMessage('Valid principal ID required'),
  body('billTo.branchWarehouse').notEmpty().withMessage('Bill to branch/warehouse required'),
  body('shipTo.branchWarehouse').notEmpty().withMessage('Ship to branch/warehouse required'),
  body('products').isArray({ min: 1 }).withMessage('At least one product required'),
  body('products.*.product').isMongoId().withMessage('Valid product ID required'),
  body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('products.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be positive')
];

// Routes
router.get('/', authenticate, checkPermission('purchase_orders', 'view'), getPurchaseOrders);
router.get('/:id', authenticate, checkPermission('purchase_orders', 'view'), getPurchaseOrder);
router.post('/', authenticate, checkPermission('purchase_orders', 'create'), purchaseOrderValidation, validate, createPurchaseOrder);
router.put('/:id', authenticate, checkPermission('purchase_orders', 'update'), updatePurchaseOrder);

// Workflow actions
router.post('/:id/approve', authenticate, checkPermission('po_workflow', 'approve_level1'), approvePurchaseOrder);
router.post('/:id/reject', authenticate, checkPermission('po_workflow', 'reject'), rejectPurchaseOrder);

router.delete('/:id', authenticate, checkPermission('purchase_orders', 'delete'), deletePurchaseOrder);

export default router;