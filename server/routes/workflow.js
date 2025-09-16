// server/routes/workflow.js - COMPLETE UPDATED VERSION
import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  getWorkflowStages,
  getWorkflowStage,
  createWorkflowStage,
  updateWorkflowStage,
  deleteWorkflowStage,
  reorderWorkflowStages,
  getWorkflowTransitions,
  createWorkflowTransition,
  updateWorkflowTransition,
  deleteWorkflowTransition,
  assignStagePermissions,
  revokeStagePermissions,
  getUserStagePermissions,
  getStageUsers,
  getWorkflowVisualization,
  validateWorkflowAction,
  getWorkflowHistory,
  getWorkflowStatistics,
  exportWorkflowReport,
  bulkAssignPermissions,
  cloneWorkflowStage
} from '../controllers/workflowController.js';

const router = express.Router();

// ========== VALIDATION RULES ==========

// Workflow Stage validation - FIXED TO ALLOW EMPTY ARRAYS
const workflowStageValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Stage name must be between 2 and 50 characters'),
  body('code')
    .trim()
    .toUpperCase()
    .isLength({ min: 2, max: 20 })
    .matches(/^[A-Z_]+$/)
    .withMessage('Stage code must contain only uppercase letters and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('sequence')
    .isInt({ min: 1 })
    .withMessage('Sequence must be a positive integer'),
  body('requiredPermissions')
    .optional()
    .isArray()
    .withMessage('Required permissions must be an array'),
  body('requiredPermissions.*')
    .optional()
    .isMongoId()
    .withMessage('Each permission must be a valid ID'),
  body('allowedActions')
    .isArray({ min: 1 })
    .withMessage('At least one allowed action is required'),
  body('allowedActions.*')
    .isIn(['edit', 'approve', 'reject', 'return', 'cancel', 'receive', 'qc_check'])
    .withMessage('Invalid action type'),
  body('nextStages')
    .optional()
    .isArray()
    .withMessage('Next stages must be an array'),
  body('nextStages.*')
    .optional()
    .isMongoId()
    .withMessage('Each next stage must be a valid ID'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Workflow Transition validation
const workflowTransitionValidation = [
  body('fromStage')
    .isMongoId()
    .withMessage('From stage must be a valid ID'),
  body('toStage')
    .isMongoId()
    .withMessage('To stage must be a valid ID'),
  body('action')
    .trim()
    .isIn(['approve', 'reject', 'return', 'cancel', 'receive', 'qc_check', 'complete'])
    .withMessage('Invalid action type'),
  body('conditions')
    .optional()
    .isObject()
    .withMessage('Conditions must be an object'),
  body('autoTransition')
    .optional()
    .isBoolean()
    .withMessage('Auto transition must be a boolean'),
  body('requiredFields')
    .optional()
    .isArray()
    .withMessage('Required fields must be an array'),
  body('notificationTemplate')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Notification template must not exceed 100 characters')
];

// Permission Assignment validation - FIXED TO ALLOW EMPTY PERMISSIONS
const permissionAssignmentValidation = [
  body('userId')
    .isMongoId()
    .withMessage('User ID must be valid'),
  body('stageId')
    .isMongoId()
    .withMessage('Stage ID must be valid'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
  body('permissions.*')
    .optional()
    .isMongoId()
    .withMessage('Each permission must be a valid ID'),
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks must not exceed 500 characters')
];

// Workflow Action validation
const workflowActionValidation = [
  body('entityId')
    .isMongoId()
    .withMessage('Entity ID must be valid'),
  body('entityType')
    .isIn(['purchase_order', 'invoice_receiving'])
    .withMessage('Invalid entity type'),
  body('action')
    .trim()
    .isIn(['approve', 'reject', 'return', 'cancel', 'receive', 'qc_check', 'complete'])
    .withMessage('Invalid action'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remarks must not exceed 1000 characters'),
  body('data')
    .optional()
    .isObject()
    .withMessage('Additional data must be an object')
];

// Bulk Assignment validation - FIXED TO ALLOW EMPTY PERMISSIONS
const bulkAssignmentValidation = [
  body('assignments')
    .isArray({ min: 1 })
    .withMessage('At least one assignment is required'),
  body('assignments.*.userId')
    .isMongoId()
    .withMessage('Each user ID must be valid'),
  body('assignments.*.stageId')
    .isMongoId()
    .withMessage('Each stage ID must be valid'),
  body('assignments.*.permissions')
    .optional()
    .isArray()
    .withMessage('Each assignment permissions must be an array'),
  body('assignments.*.permissions.*')
    .optional()
    .isMongoId()
    .withMessage('Each permission must be a valid ID'),
  body('overwrite')
    .optional()
    .isBoolean()
    .withMessage('Overwrite must be a boolean')
];

// ========== WORKFLOW STAGE ROUTES ==========

// Get all workflow stages
router.get('/stages',
  authenticate,
  checkPermission('workflow', 'view'),
  async (req, res, next) => {
    try {
      await query('isActive').optional().isBoolean().run(req);
      await query('search').optional().trim().run(req);
      validate(req, res, next);
    } catch (error) {
      next(error);
    }
  },
  getWorkflowStages
);

// Get single workflow stage
router.get('/stages/:id',
  authenticate,
  checkPermission('workflow', 'view'),
  async (req, res, next) => {
    try {
      await param('id').isMongoId().withMessage('Invalid stage ID').run(req);
      validate(req, res, next);
    } catch (error) {
      next(error);
    }
  },
  getWorkflowStage
);

// Create workflow stage
router.post('/stages',
  authenticate,
  checkPermission('workflow', 'manage'),
  workflowStageValidation,
  validate,
  createWorkflowStage
);

// Update workflow stage
router.put('/stages/:id',
  authenticate,
  checkPermission('workflow', 'manage'),
  async (req, res, next) => {
    try {
      await param('id').isMongoId().withMessage('Invalid stage ID').run(req);
      next();
    } catch (error) {
      next(error);
    }
  },
  workflowStageValidation,
  validate,
  updateWorkflowStage
);

// Delete workflow stage
router.delete('/stages/:id',
  authenticate,
  checkPermission('workflow', 'manage'),
  async (req, res, next) => {
    try {
      await param('id').isMongoId().withMessage('Invalid stage ID').run(req);
      validate(req, res, next);
    } catch (error) {
      next(error);
    }
  },
  deleteWorkflowStage
);

// Reorder workflow stages
router.post('/stages/reorder',
  authenticate,
  checkPermission('workflow', 'manage'),
  [
    body('stages')
      .isArray({ min: 1 })
      .withMessage('Stages array is required'),
    body('stages.*.id')
      .isMongoId()
      .withMessage('Each stage must have a valid ID'),
    body('stages.*.sequence')
      .isInt({ min: 1 })
      .withMessage('Each stage must have a valid sequence number')
  ],
  validate,
  reorderWorkflowStages
);

// Clone workflow stage
router.post('/stages/:id/clone',
  authenticate,
  checkPermission('workflow', 'manage'),
  async (req, res, next) => {
    try {
      await param('id').isMongoId().withMessage('Invalid stage ID').run(req);
      await body('name').trim().isLength({ min: 2 }).withMessage('New stage name is required').run(req);
      await body('code').trim().toUpperCase().isLength({ min: 2 }).withMessage('New stage code is required').run(req);
      validate(req, res, next);
    } catch (error) {
      next(error);
    }
  },
  cloneWorkflowStage
);

// ========== WORKFLOW TRANSITION ROUTES ==========

// Get workflow transitions
router.get('/transitions',
  authenticate,
  checkPermission('workflow', 'view'),
  async (req, res, next) => {
    try {
      await query('fromStage').optional().isMongoId().run(req);
      await query('toStage').optional().isMongoId().run(req);
      await query('action').optional().trim().run(req);
      validate(req, res, next);
    } catch (error) {
      next(error);
    }
  },
  getWorkflowTransitions
);

// Create workflow transition
router.post('/transitions',
  authenticate,
  checkPermission('workflow', 'manage'),
  workflowTransitionValidation,
  validate,
  createWorkflowTransition
);

// Update workflow transition
router.put('/transitions/:id',
  authenticate,
  checkPermission('workflow', 'manage'),
  async (req, res, next) => {
    try {
      await param('id').isMongoId().withMessage('Invalid transition ID').run(req);
      next();
    } catch (error) {
      next(error);
    }
  },
  workflowTransitionValidation,
  validate,
  updateWorkflowTransition
);

// Delete workflow transition
router.delete('/transitions/:id',
  authenticate,
  checkPermission('workflow', 'manage'),
  async (req, res, next) => {
    try {
      await param('id').isMongoId().withMessage('Invalid transition ID').run(req);
      validate(req, res, next);
    } catch (error) {
      next(error);
    }
  },
  deleteWorkflowTransition
);

// ========== PERMISSION MANAGEMENT ROUTES ==========

// Assign permissions to user for stage
router.post('/permissions/assign',
  authenticate,
  checkPermission('workflow', 'assign'),
  permissionAssignmentValidation,
  validate,
  assignStagePermissions
);

// Revoke permissions from user for stage
router.post('/permissions/revoke',
  authenticate,
  checkPermission('workflow', 'assign'),
  [
    body('userId').isMongoId().withMessage('User ID must be valid'),
    body('stageId').isMongoId().withMessage('Stage ID must be valid'),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),
    body('permissions.*')
      .optional()
      .isMongoId()
      .withMessage('Each permission must be a valid ID')
  ],
  validate,
  revokeStagePermissions
);

// Bulk assign permissions
router.post('/permissions/bulk-assign',
  authenticate,
  checkPermission('workflow', 'assign'),
  bulkAssignmentValidation,
  validate,
  bulkAssignPermissions
);

// Get user permissions for a stage
router.get('/permissions/user/:userId/stage/:stageId',
  authenticate,
  checkPermission('workflow', 'view'),
  async (req, res, next) => {
    try {
      await param('userId').isMongoId().withMessage('Invalid user ID').run(req);
      await param('stageId').isMongoId().withMessage('Invalid stage ID').run(req);
      validate(req, res, next);
    } catch (error) {
      next(error);
    }
  },
  getUserStagePermissions
);

// Get all users with permissions for a stage
router.get('/permissions/stage/:stageId/users',
  authenticate,
  checkPermission('workflow', 'view'),
  async (req, res, next) => {
    try {
      await param('stageId').isMongoId().withMessage('Invalid stage ID').run(req);
      await query('includePermissions').optional().isBoolean().run(req);
      validate(req, res, next);
    } catch (error) {
      next(error);
    }
  },
  getStageUsers
);

// ========== WORKFLOW OPERATIONS ==========

// Validate workflow action
router.post('/validate',
  authenticate,
  workflowActionValidation,
  validate,
  validateWorkflowAction
);

// Get workflow visualization data
router.get('/visualization',
  authenticate,
  checkPermission('workflow', 'view'),
  async (req, res, next) => {
    try {
      await query('format').optional().isIn(['json', 'mermaid', 'graphviz']).run(req);
      validate(req, res, next);
    } catch (error) {
      next(error);
    }
  },
  getWorkflowVisualization
);

// Get workflow history for an entity
router.get('/history/:entityType/:entityId',
  authenticate,
  checkPermission('workflow', 'view'),
  async (req, res, next) => {
    try {
      await param('entityType').isIn(['purchase_order', 'invoice_receiving']).run(req);
      await param('entityId').isMongoId().withMessage('Invalid entity ID').run(req);
      await query('page').optional().isInt({ min: 1 }).run(req);
      await query('limit').optional().isInt({ min: 1, max: 100 }).run(req);
      validate(req, res, next);
    } catch (error) {
      next(error);
    }
  },
  getWorkflowHistory
);

// ========== REPORTING & ANALYTICS ==========

// Get workflow statistics
router.get('/statistics',
  authenticate,
  checkPermission('workflow', 'view'),
  async (req, res, next) => {
    try {
      await query('fromDate').optional().isISO8601().run(req);
      await query('toDate').optional().isISO8601().run(req);
      await query('stageId').optional().isMongoId().run(req);
      await query('entityType').optional().isIn(['purchase_order', 'invoice_receiving']).run(req);
      validate(req, res, next);
    } catch (error) {
      next(error);
    }
  },
  getWorkflowStatistics
);

// Export workflow report
router.get('/export',
  authenticate,
  checkPermission('workflow', 'view'),
  async (req, res, next) => {
    try {
      await query('format').isIn(['pdf', 'excel', 'csv']).run(req);
      await query('fromDate').optional().isISO8601().run(req);
      await query('toDate').optional().isISO8601().run(req);
      await query('includeHistory').optional().isBoolean().run(req);
      validate(req, res, next);
    } catch (error) {
      next(error);
    }
  },
  exportWorkflowReport
);

export default router;