// server/routes/warehouseApproval.js
import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  getWarehouseApproval,
  getWarehouseApprovals,
  updateProductWarehouseCheck,
  submitForManagerApproval,
  approveWarehouseApproval,
  rejectWarehouseApproval,
  getWarehouseApprovalStatistics,
  getWarehouseApprovalDashboard,
  bulkAssignWarehouseApproval,
  getWarehouseApprovalWorkload
} from '../controllers/warehouseApprovalController.js';

const router = express.Router();

// Validation rules
const warehouseChecksValidation = [
  body('products').isArray().withMessage('Products must be an array'),
  body('products.*.productId').isMongoId().withMessage('Valid product ID required'),
  body('products.*.storageLocation').optional().isObject().withMessage('Storage location must be an object'),
  body('products.*.storageLocation.zone').optional().isString().withMessage('Zone must be a string'),
  body('products.*.storageLocation.rack').optional().isString().withMessage('Rack must be a string'),
  body('products.*.storageLocation.shelf').optional().isString().withMessage('Shelf must be a string'),
  body('products.*.storageLocation.bin').optional().isString().withMessage('Bin must be a string'),
  body('products.*.physicalChecks').optional().isObject().withMessage('Physical checks must be an object'),
  body('products.*.physicalChecks.packagingIntegrity').optional().isBoolean(),
  body('products.*.physicalChecks.labelAccuracy').optional().isBoolean(),
  body('products.*.physicalChecks.quantityVerification').optional().isBoolean(),
  body('products.*.physicalChecks.storageConditions').optional().isBoolean(),
  body('products.*.warehouseDecision').isIn(['approved', 'rejected', 'partial_approved']).withMessage('Valid warehouse decision required'),
  body('products.*.warehouseRemarks').optional().isString().withMessage('Warehouse remarks must be a string'),
  body('products.*.rejectionReason').optional().isString().withMessage('Rejection reason must be a string')
];

const managerApprovalValidation = [
  body('managerDecision').isIn(['approved', 'rejected']).withMessage('Valid manager decision required'),
  body('managerRemarks').optional().isString().withMessage('Manager remarks must be a string')
];

// Routes

// Get all warehouse approval records with filtering
router.get('/', 
  authenticate, 
  checkPermission('warehouse_approval', 'view'),
  [
    query('status').optional().isIn(['pending', 'in_progress', 'submitted', 'approved', 'rejected']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('overallResult').optional().isIn(['approved', 'rejected', 'partial_approved']),
    query('warehouse').optional().isMongoId().withMessage('Valid warehouse ID required'),
    query('assignedTo').optional().isMongoId().withMessage('Valid user ID required'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  validate,
  getWarehouseApprovals
);

// Get single warehouse approval record
router.get('/:id', 
  authenticate, 
  checkPermission('warehouse_approval', 'view'),
  [param('id').isMongoId().withMessage('Valid warehouse approval ID required')],
  validate,
  getWarehouseApproval
);

// Update warehouse checks for products
router.put('/:id/checks', 
  authenticate, 
  checkPermission('warehouse_approval', 'update'),
  [param('id').isMongoId().withMessage('Valid warehouse approval ID required')],
  warehouseChecksValidation,
  validate,
  updateProductWarehouseCheck
);

// Submit warehouse approval for manager approval
router.post('/:id/submit', 
  authenticate, 
  checkPermission('warehouse_approval', 'submit'),
  [
    param('id').isMongoId().withMessage('Valid warehouse approval ID required'),
    body('warehouseRemarks').optional().isString().withMessage('Warehouse remarks must be a string'),
    body('warehouseDocuments').optional().isArray().withMessage('Warehouse documents must be an array')
  ],
  validate,
  submitForManagerApproval
);

// Manager approve warehouse approval
router.post('/:id/approve', 
  authenticate, 
  checkPermission('warehouse_approval', 'manager_approve'),
  [param('id').isMongoId().withMessage('Valid warehouse approval ID required')],
  managerApprovalValidation,
  validate,
  approveWarehouseApproval
);

// Manager reject warehouse approval
router.post('/:id/reject', 
  authenticate, 
  checkPermission('warehouse_approval', 'manager_approve'),
  [param('id').isMongoId().withMessage('Valid warehouse approval ID required')],
  managerApprovalValidation,
  validate,
  rejectWarehouseApproval
);

// Get warehouse approval statistics
router.get('/statistics/overview', 
  authenticate, 
  checkPermission('warehouse_approval', 'view'),
  [
    query('dateFrom').optional().isISO8601().withMessage('Valid from date required'),
    query('dateTo').optional().isISO8601().withMessage('Valid to date required'),
    query('warehouse').optional().isMongoId().withMessage('Valid warehouse ID required'),
    query('assignedTo').optional().isMongoId().withMessage('Valid user ID required')
  ],
  validate,
  getWarehouseApprovalStatistics
);

// Get warehouse approval dashboard
router.get('/dashboard', 
  authenticate, 
  checkPermission('warehouse_approval', 'view'),
  [
    query('timeframe').optional().isInt({ min: 1, max: 365 }).withMessage('Timeframe must be between 1-365 days'),
    query('warehouse').optional().isMongoId().withMessage('Valid warehouse ID required')
  ],
  validate,
  getWarehouseApprovalDashboard
);

// Bulk assign warehouse approval records
router.post('/bulk-assign', 
  authenticate, 
  checkPermission('warehouse_approval', 'manage'),
  [
    body('warehouseApprovalIds').isArray({ min: 1 }).withMessage('Warehouse approval IDs array is required'),
    body('warehouseApprovalIds.*').isMongoId().withMessage('Valid warehouse approval ID required'),
    body('assignedTo').isMongoId().withMessage('Valid user ID required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority required')
  ],
  validate,
  bulkAssignWarehouseApproval
);

// Get warehouse approval workload by user
router.get('/workload', 
  authenticate, 
  checkPermission('warehouse_approval', 'view'),
  [
    query('status').optional().isIn(['active', 'all']).withMessage('Valid status filter required')
  ],
  validate,
  getWarehouseApprovalWorkload
);

export default router;