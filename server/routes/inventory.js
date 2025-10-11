// server/routes/inventory.js
import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  getInventoryRecords,
  getInventoryRecord,
  updateInventoryRecord,
  adjustStock,
  reserveStock,
  releaseReservation,
  transferStock,
  recordUtilization,
  getInventoryStatistics,
  getStockMovementHistory,
  getInventoryDashboard,
  bulkUpdateInventory,
  getInventoryAlerts,
  getInventoryValuation
} from '../controllers/inventoryController.js';

const router = express.Router();

// Validation rules
const inventoryUpdateValidation = [
  body('minimumStock').optional().isInt({ min: 0 }).withMessage('Minimum stock must be non-negative'),
  body('maximumStock').optional().isInt({ min: 0 }).withMessage('Maximum stock must be non-negative'),
  body('reorderLevel').optional().isInt({ min: 0 }).withMessage('Reorder level must be non-negative'),
  body('location').optional().isObject().withMessage('Location must be an object'),
  body('location.zone').optional().isString().withMessage('Zone must be a string'),
  body('location.rack').optional().isString().withMessage('Rack must be a string'),
  body('location.shelf').optional().isString().withMessage('Shelf must be a string'),
  body('location.bin').optional().isString().withMessage('Bin must be a string'),
  body('storageConditions').optional().isObject().withMessage('Storage conditions must be an object'),
  body('storageConditions.temperature').optional().isObject(),
  body('storageConditions.humidity').optional().isObject(),
  body('stockStatus').optional().isIn(['available', 'reserved', 'blocked', 'expired', 'damaged']).withMessage('Valid stock status required')
];

const stockAdjustmentValidation = [
  body('adjustmentType').isIn(['add', 'remove']).withMessage('Valid adjustment type required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('reason').isString().notEmpty().withMessage('Reason is required'),
  body('remarks').optional().isString().withMessage('Remarks must be a string')
];

const stockReservationValidation = [
  body('reservedFor').isString().notEmpty().withMessage('Reserved for is required'),
  body('reservedQty').isInt({ min: 1 }).withMessage('Reserved quantity must be positive'),
  body('expiryDate').optional().isISO8601().withMessage('Valid expiry date required'),
  body('referenceId').optional().isMongoId().withMessage('Valid reference ID required'),
  body('referenceNumber').optional().isString().withMessage('Reference number must be a string'),
  body('remarks').optional().isString().withMessage('Remarks must be a string')
];

const stockTransferValidation = [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('toWarehouse').optional().isMongoId().withMessage('Valid warehouse ID required'),
  body('toLocation').optional().isObject().withMessage('To location must be an object'),
  body('toLocation.zone').optional().isString().withMessage('Zone must be a string'),
  body('toLocation.rack').optional().isString().withMessage('Rack must be a string'),
  body('toLocation.shelf').optional().isString().withMessage('Shelf must be a string'),
  body('toLocation.bin').optional().isString().withMessage('Bin must be a string'),
  body('reason').isString().notEmpty().withMessage('Reason is required'),
  body('remarks').optional().isString().withMessage('Remarks must be a string'),
  body('referenceNumber').optional().isString().withMessage('Reference number must be a string')
];

const utilizationValidation = [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('hospital').optional().isMongoId().withMessage('Valid hospital ID required'),
  body('hospitalName').isString().notEmpty().withMessage('Hospital name is required'),
  body('caseNumber').optional().isString().withMessage('Case number must be a string'),
  body('patient').optional().isMongoId().withMessage('Valid patient ID required'),
  body('patientName').optional().isString().withMessage('Patient name must be a string'),
  body('patientId').optional().isString().withMessage('Patient ID must be a string'),
  body('doctor').optional().isMongoId().withMessage('Valid doctor ID required'),
  body('doctorName').optional().isString().withMessage('Doctor name must be a string'),
  body('utilizationReason').isString().notEmpty().withMessage('Utilization reason is required'),
  body('remarks').optional().isString().withMessage('Remarks must be a string')
];

const bulkUpdateValidation = [
  body('inventoryIds').isArray({ min: 1 }).withMessage('Inventory IDs array is required'),
  body('inventoryIds.*').isMongoId().withMessage('Valid inventory IDs required'),
  body('updateData').isObject().withMessage('Update data is required'),
  body('updateData.minimumStock').optional().isInt({ min: 0 }).withMessage('Minimum stock must be non-negative'),
  body('updateData.maximumStock').optional().isInt({ min: 0 }).withMessage('Maximum stock must be non-negative'),
  body('updateData.reorderLevel').optional().isInt({ min: 0 }).withMessage('Reorder level must be non-negative'),
  body('updateData.storageConditions').optional().isObject().withMessage('Storage conditions must be an object'),
  body('updateData.location').optional().isObject().withMessage('Location must be an object')
];

// Routes

// Get all inventory records with filtering
router.get('/', 
  authenticate, 
  checkPermission('inventory', 'view'),
  [
    query('warehouse').optional().isMongoId().withMessage('Valid warehouse ID required'),
    query('product').optional().isMongoId().withMessage('Valid product ID required'),
    query('stockStatus').optional().isIn(['available', 'reserved', 'blocked', 'expired', 'damaged']),
    query('expiryStatus').optional().isIn(['expired', 'near_expiry', 'expiring_soon', 'good']),
    query('lowStock').optional().isBoolean(),
    query('nearExpiry').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  validate,
  getInventoryRecords
);

// Get single inventory record with complete history
router.get('/:id', 
  authenticate, 
  checkPermission('inventory', 'view'),
  [param('id').isMongoId().withMessage('Valid inventory ID required')],
  validate,
  getInventoryRecord
);

// Update inventory record
router.put('/:id', 
  authenticate, 
  checkPermission('inventory', 'update'),
  [param('id').isMongoId().withMessage('Valid inventory ID required')],
  inventoryUpdateValidation,
  validate,
  updateInventoryRecord
);

// Stock adjustment (add/remove stock)
router.post('/:id/adjust', 
  authenticate, 
  checkPermission('inventory', 'stock_adjust'),
  [param('id').isMongoId().withMessage('Valid inventory ID required')],
  stockAdjustmentValidation,
  validate,
  adjustStock
);

// Reserve stock
router.post('/:id/reserve', 
  authenticate, 
  checkPermission('inventory', 'stock_reserve'),
  [param('id').isMongoId().withMessage('Valid inventory ID required')],
  stockReservationValidation,
  validate,
  reserveStock
);

// Release stock reservation
router.delete('/:id/reservations/:reservationId', 
  authenticate, 
  checkPermission('inventory', 'stock_reserve'),
  [
    param('id').isMongoId().withMessage('Valid inventory ID required'),
    param('reservationId').isMongoId().withMessage('Valid reservation ID required')
  ],
  validate,
  releaseReservation
);

// Transfer stock between locations
router.post('/:id/transfer', 
  authenticate, 
  checkPermission('inventory', 'stock_transfer'),
  [param('id').isMongoId().withMessage('Valid inventory ID required')],
  stockTransferValidation,
  validate,
  transferStock
);

// Record stock utilization (to hospital/patient)
router.post('/:id/utilize', 
  authenticate, 
  checkPermission('inventory', 'stock_utilize'),
  [param('id').isMongoId().withMessage('Valid inventory ID required')],
  utilizationValidation,
  validate,
  recordUtilization
);

// Get stock movement history for a specific inventory item
router.get('/:id/movements', 
  authenticate, 
  checkPermission('inventory', 'view'),
  [
    param('id').isMongoId().withMessage('Valid inventory ID required'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  getStockMovementHistory
);

// Get inventory statistics
router.get('/statistics/overview', 
  authenticate, 
  checkPermission('inventory', 'view'),
  [
    query('warehouse').optional().isMongoId().withMessage('Valid warehouse ID required'),
    query('dateFrom').optional().isISO8601().withMessage('Valid from date required'),
    query('dateTo').optional().isISO8601().withMessage('Valid to date required')
  ],
  validate,
  getInventoryStatistics
);

// Dashboard endpoint
router.get('/dashboard', 
  authenticate, 
  checkPermission('inventory', 'view'),
  [
    query('timeframe').optional().isInt({ min: 1 }).withMessage('Timeframe must be positive'),
    query('warehouse').optional().isMongoId().withMessage('Valid warehouse ID required')
  ],
  validate,
  getInventoryDashboard
);

// Bulk update endpoint
router.put('/bulk-update', 
  authenticate, 
  checkPermission('inventory', 'update'),
  bulkUpdateValidation,
  validate,
  bulkUpdateInventory
);

// Alerts endpoint
router.get('/alerts', 
  authenticate, 
  checkPermission('inventory', 'view'),
  [
    query('warehouse').optional().isMongoId().withMessage('Valid warehouse ID required'),
    query('alertType').optional().isIn(['all', 'low_stock', 'out_of_stock', 'near_expiry', 'expired']).withMessage('Valid alert type required')
  ],
  validate,
  getInventoryAlerts
);

// Valuation report endpoint
router.get('/valuation', 
  authenticate, 
  checkPermission('inventory', 'view'),
  [
    query('warehouse').optional().isMongoId().withMessage('Valid warehouse ID required'),
    query('category').optional().isString().withMessage('Category must be a string'),
    query('dateFrom').optional().isISO8601().withMessage('Valid from date required'),
    query('dateTo').optional().isISO8601().withMessage('Valid to date required')
  ],
  validate,
  getInventoryValuation
);

export default router;