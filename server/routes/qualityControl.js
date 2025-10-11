// server/routes/qualityControl.js
import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  createQCFromInvoice,
  getQCRecord,
  getQCRecords,
  updateItemQC,
  submitQCForApproval,
  approveQC,
  rejectQC,
  getQCStatistics,
  getQCDashboard,
  bulkAssignQC,
  getQCWorkload
} from '../controllers/qualityControlController.js';

const router = express.Router();

// IMPORTANT: Specific routes MUST come before dynamic routes (/:id)

// Dashboard route - MUST be before /:id
router.get('/dashboard', 
  authenticate, 
  checkPermission('quality_control', 'view'),
  [
    query('timeframe').optional().isInt({ min: 1, max: 365 }),
    query('warehouse').optional().isMongoId()
  ],
  validate,
  getQCDashboard
);

// Statistics route - MUST be before /:id
router.get('/statistics', 
  authenticate, 
  checkPermission('quality_control', 'view'),
  [
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601()
  ],
  validate,
  getQCStatistics
);

// Workload route - MUST be before /:id
router.get('/workload', 
  authenticate, 
  checkPermission('quality_control', 'view'),
  [
    query('status').optional().isIn(['active', 'all'])
  ],
  validate,
  getQCWorkload
);

// Bulk assign route - MUST be before /:id
router.post('/bulk-assign', 
  authenticate, 
  checkPermission('quality_control', 'manage'),
  [
    body('qcIds').isArray({ min: 1 }),
    body('qcIds.*').isMongoId(),
    body('assignedTo').isMongoId(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
  ],
  validate,
  bulkAssignQC
);

// Get all QC records with filtering
router.get('/', 
  authenticate, 
  checkPermission('quality_control', 'view'),
  [
    query('status').optional().isIn(['pending', 'in_progress', 'pending_approval', 'completed', 'rejected']),
    query('qcType').optional().isIn(['standard', 'urgent', 'special']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('result').optional().isIn(['pending', 'passed', 'failed', 'partial_pass']),
    query('assignedTo').optional().isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601()
  ],
  validate,
  getQCRecords
);

// Create QC record from invoice receiving
router.post('/from-invoice/:invoiceReceivingId', 
  authenticate, 
  checkPermission('quality_control', 'create'),
  [
    param('invoiceReceivingId').isMongoId(),
    body('qcType').optional().isIn(['standard', 'urgent', 'special']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('assignedTo').optional().isMongoId()
  ],
  validate,
  createQCFromInvoice
);

// Get single QC record - Dynamic route comes after specific routes
router.get('/:id', 
  authenticate, 
  checkPermission('quality_control', 'view'),
  [param('id').isMongoId()],
  validate,
  getQCRecord
);

// Update item-level QC
router.put('/:qcId/product/:productIndex/item/:itemIndex', 
  authenticate, 
  checkPermission('quality_control', 'update'),
  [
    param('qcId').isMongoId(),
    param('productIndex').isInt({ min: 0 }),
    param('itemIndex').isInt({ min: 0 }),
    body('status').isIn(['passed', 'failed']),
    body('qcReasons').optional().isArray(),
    body('remarks').optional().isString()
  ],
  validate,
  updateItemQC
);

// Submit QC for approval
router.put('/:id/submit', 
  authenticate, 
  checkPermission('quality_control', 'submit'),
  [
    param('id').isMongoId(),
    body('qcRemarks').optional().isString(),
    body('qcEnvironment').optional().isObject()
  ],
  validate,
  submitQCForApproval
);

// Approve QC
router.put('/:id/approve', 
  authenticate, 
  checkPermission('quality_control', 'approve'),
  [
    param('id').isMongoId(),
    body('approvalRemarks').optional().isString()
  ],
  validate,
  approveQC
);

// Reject QC
router.put('/:id/reject', 
  authenticate, 
  checkPermission('quality_control', 'approve'),
  [
    param('id').isMongoId(),
    body('approvalRemarks').isString().notEmpty()
  ],
  validate,
  rejectQC
);

export default router;