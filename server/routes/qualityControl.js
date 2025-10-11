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

// Validation rules
const qcItemUpdateValidation = [
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.itemId').isMongoId().withMessage('Valid item ID required'),
  body('items.*.qcStatus').isIn([
    'received_correctly', 'damaged_packaging', 'expired', 'near_expiry',
    'wrong_product', 'quantity_mismatch', 'quality_issue', 'documentation_issue'
  ]).withMessage('Valid QC status required'),
  body('items.*.qcRemarks').optional().isString().withMessage('QC remarks must be a string'),
  body('items.*.qcImages').optional().isArray().withMessage('QC images must be an array')
];

const qcSubmissionValidation = [
  body('overallResult').isIn(['passed', 'failed', 'partial']).withMessage('Valid overall result required'),
  body('qcRemarks').optional().isString().withMessage('QC remarks must be a string'),
  body('qcDocuments').optional().isArray().withMessage('QC documents must be an array')
];

const qcApprovalValidation = [
  body('approvalDecision').isIn(['approved', 'rejected']).withMessage('Valid approval decision required'),
  body('approvalRemarks').optional().isString().withMessage('Approval remarks must be a string')
];

// Routes

// Get all QC records with filtering
router.get('/', 
  authenticate, 
  checkPermission('quality_control', 'view'),
  [
    query('status').optional().isIn(['pending', 'in_progress', 'completed', 'approved', 'rejected']),
    query('qcType').optional().isIn(['incoming', 'random', 'complaint', 'return']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('overallResult').optional().isIn(['passed', 'failed', 'partial']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  validate,
  getQCRecords
);

// Get single QC record
router.get('/:id', 
  authenticate, 
  checkPermission('quality_control', 'view'),
  [param('id').isMongoId().withMessage('Valid QC ID required')],
  validate,
  getQCRecord
);

// Create QC record from invoice receiving
router.post('/', 
  authenticate, 
  checkPermission('quality_control', 'create'),
  [
    body('invoiceReceiving').isMongoId().withMessage('Valid invoice receiving ID required'),
    body('qcType').optional().isIn(['incoming', 'random', 'complaint', 'return']).withMessage('Valid QC type required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority required'),
    body('assignedTo').optional().isMongoId().withMessage('Valid user ID required for assignment'),
    body('scheduledDate').optional().isISO8601().withMessage('Valid scheduled date required'),
    body('remarks').optional().isString().withMessage('Remarks must be a string')
  ],
  validate,
  createQCFromInvoice
);

// Update QC item details
router.put('/:id/items', 
  authenticate, 
  checkPermission('quality_control', 'update'),
  [param('id').isMongoId().withMessage('Valid QC ID required')],
  qcItemUpdateValidation,
  validate,
  updateItemQC
);

// Submit QC for approval
router.post('/:id/submit', 
  authenticate, 
  checkPermission('quality_control', 'submit'),
  [param('id').isMongoId().withMessage('Valid QC ID required')],
  qcSubmissionValidation,
  validate,
  submitQCForApproval
);

// Approve QC
router.post('/:id/approve', 
  authenticate, 
  checkPermission('quality_control', 'approve'),
  [param('id').isMongoId().withMessage('Valid QC ID required')],
  qcApprovalValidation,
  validate,
  approveQC
);

// Reject QC record
router.post('/:id/reject', 
  authenticate, 
  checkPermission('quality_control', 'approve'),
  [param('id').isMongoId().withMessage('Valid QC ID required')],
  qcApprovalValidation,
  validate,
  rejectQC
);

// Get QC statistics
router.get('/statistics/overview', 
  authenticate, 
  checkPermission('quality_control', 'view'),
  [
    query('dateFrom').optional().isISO8601().withMessage('Valid from date required'),
    query('dateTo').optional().isISO8601().withMessage('Valid to date required'),
    query('qcType').optional().isIn(['incoming', 'random', 'complaint', 'return']),
    query('assignedTo').optional().isMongoId().withMessage('Valid user ID required')
  ],
  validate,
  getQCStatistics
);

// Get QC dashboard for managers
router.get('/dashboard', 
  authenticate, 
  checkPermission('quality_control', 'manage'),
  [
    query('timeframe').optional().isInt({ min: 1, max: 365 }).withMessage('Valid timeframe required'),
    query('warehouse').optional().isMongoId().withMessage('Valid warehouse ID required')
  ],
  validate,
  getQCDashboard
);

// Bulk assign QC records
router.post('/bulk-assign', 
  authenticate, 
  checkPermission('quality_control', 'manage'),
  [
    body('qcIds').isArray({ min: 1 }).withMessage('QC IDs array is required'),
    body('qcIds.*').isMongoId().withMessage('Valid QC ID required'),
    body('assignedTo').isMongoId().withMessage('Valid user ID required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority required')
  ],
  validate,
  bulkAssignQC
);

// Get QC workload by user
router.get('/workload', 
  authenticate, 
  checkPermission('quality_control', 'manage'),
  [
    query('status').optional().isIn(['active', 'all']).withMessage('Valid status filter required')
  ],
  validate,
  getQCWorkload
);

export default router;