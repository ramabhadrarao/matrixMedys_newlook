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

// IMPORTANT: Specific routes MUST come before dynamic routes (/:id)

// Dashboard route - MUST be before /:id
router.get('/dashboard', 
  authenticate, 
  checkPermission('warehouse_approval', 'view'),
  [
    query('timeframe').optional().isInt({ min: 1, max: 365 }),
    query('warehouse').optional().isMongoId()
  ],
  validate,
  getWarehouseApprovalDashboard
);

// Statistics route - MUST be before /:id
router.get('/statistics', 
  authenticate, 
  checkPermission('warehouse_approval', 'view'),
  [
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601()
  ],
  validate,
  getWarehouseApprovalStatistics
);

// Workload route - MUST be before /:id
router.get('/workload', 
  authenticate, 
  checkPermission('warehouse_approval', 'view'),
  [
    query('status').optional().isIn(['active', 'all'])
  ],
  validate,
  getWarehouseApprovalWorkload
);

// Bulk assign route - MUST be before /:id
router.post('/bulk-assign', 
  authenticate, 
  checkPermission('warehouse_approval', 'manage'),
  [
    body('warehouseApprovalIds').isArray({ min: 1 }),
    body('warehouseApprovalIds.*').isMongoId(),
    body('assignedTo').isMongoId(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
  ],
  validate,
  bulkAssignWarehouseApproval
);

// Get all warehouse approval records with filtering
router.get('/', 
  authenticate, 
  checkPermission('warehouse_approval', 'view'),
  [
    query('status').optional().isIn(['pending', 'in_progress', 'pending_manager_approval', 'completed', 'rejected']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('assignedTo').optional().isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  getWarehouseApprovals
);

// Get single warehouse approval record - Dynamic route comes after specific routes
router.get('/:id', 
  authenticate, 
  checkPermission('warehouse_approval', 'view'),
  [param('id').isMongoId()],
  validate,
  getWarehouseApproval
);

// Update product warehouse check
router.put('/:warehouseApprovalId/product/:productIndex', 
  authenticate, 
  checkPermission('warehouse_approval', 'update'),
  [
    param('warehouseApprovalId').isMongoId(),
    param('productIndex').isInt({ min: 0 })
  ],
  validate,
  updateProductWarehouseCheck
);

// Submit warehouse approval for manager approval
router.post('/:id/submit', 
  authenticate, 
  checkPermission('warehouse_approval', 'submit'),
  [param('id').isMongoId()],
  validate,
  submitForManagerApproval
);

// Manager approve warehouse approval
router.post('/:id/approve', 
  authenticate, 
  checkPermission('warehouse_approval', 'approve'),
  [param('id').isMongoId()],
  validate,
  approveWarehouseApproval
);

// Manager reject warehouse approval
router.post('/:id/reject', 
  authenticate, 
  checkPermission('warehouse_approval', 'approve'),
  [param('id').isMongoId()],
  validate,
  rejectWarehouseApproval
);

export default router;