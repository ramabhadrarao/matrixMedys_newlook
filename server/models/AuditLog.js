// server/models/AuditLog.js
import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // Action Details
  action: {
    type: String,
    required: true,
    enum: [
      // QC Actions
      'qc_created',
      'qc_assigned',
      'qc_started',
      'qc_item_checked',
      'qc_product_completed',
      'qc_submitted',
      'qc_approved',
      'qc_rejected',
      'qc_cancelled',
      
      // Warehouse Actions
      'warehouse_approval_created',
      'warehouse_approval_assigned',
      'warehouse_approval_started',
      'warehouse_check_performed',
      'warehouse_product_approved',
      'warehouse_product_rejected',
      'warehouse_approval_submitted',
      'warehouse_manager_approved',
      'warehouse_manager_rejected',
      'warehouse_approval_completed',
      'warehouse_approval_cancelled',
      
      // Inventory Actions
      'inventory_created',
      'inventory_updated',
      'stock_adjusted',
      'stock_reserved',
      'stock_released',
      'stock_transferred',
      'inventory_alert_generated',
      
      // System Actions
      'workflow_transitioned',
      'notification_sent',
      'document_uploaded',
      'document_deleted',
      'user_login',
      'user_logout',
      'permission_changed',
      'system_backup',
      'system_restore'
    ]
  },
  
  // Entity Information
  entityType: {
    type: String,
    required: true,
    enum: [
      'invoice_receiving',
      'quality_control',
      'warehouse_approval',
      'inventory',
      'purchase_order',
      'user',
      'notification',
      'document',
      'system'
    ]
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  entityNumber: String, // Human-readable identifier (QC number, WA number, etc.)
  
  // User Information
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedByName: String, // Cached for performance
  performedByRole: String, // User's role at time of action
  
  // Action Context
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'assign', 'transfer', 'system'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Change Details
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changeType: { type: String, enum: ['added', 'modified', 'removed'], default: 'modified' }
  }],
  
  // Additional Context
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    requestId: String,
    source: { type: String, enum: ['web', 'mobile', 'api', 'system'], default: 'web' },
    module: String, // Which module/feature was used
    workflow: String, // Which workflow this belongs to
    batchId: String // For bulk operations
  },
  
  // Related Entities
  relatedEntities: [{
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,
    entityNumber: String,
    relationship: String // 'parent', 'child', 'sibling', 'reference'
  }],
  
  // Status and Flags
  status: {
    type: String,
    enum: ['success', 'failed', 'partial', 'pending'],
    default: 'success'
  },
  isSystemGenerated: {
    type: Boolean,
    default: false
  },
  isSecurityRelevant: {
    type: Boolean,
    default: false
  },
  
  // Error Information (if action failed)
  error: {
    code: String,
    message: String,
    stack: String
  },
  
  // Retention
  retentionDate: Date, // When this log can be archived/deleted
  isArchived: {
    type: Boolean,
    default: false
  }
  
}, { 
  timestamps: true,
  // Automatically add createdAt and updatedAt
});

// Indexes for performance and querying
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, severity: 1 });
auditLogSchema.index({ 'metadata.workflow': 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 }); // For general chronological queries
auditLogSchema.index({ retentionDate: 1 }); // For cleanup operations
auditLogSchema.index({ isSecurityRelevant: 1, createdAt: -1 }); // For security audits

// Static methods for creating specific audit log entries
auditLogSchema.statics.logQCAction = function(action, qcRecord, user, changes = [], metadata = {}) {
  return this.create({
    action,
    entityType: 'quality_control',
    entityId: qcRecord._id,
    entityNumber: qcRecord.qcNumber,
    performedBy: user._id,
    performedByName: user.name,
    performedByRole: user.role,
    description: this.getActionDescription(action, qcRecord),
    category: this.getCategoryFromAction(action),
    changes,
    metadata: {
      ...metadata,
      module: 'quality_control',
      workflow: 'qc_workflow'
    },
    relatedEntities: [{
      entityType: 'invoice_receiving',
      entityId: qcRecord.invoiceReceiving,
      relationship: 'parent'
    }]
  });
};

auditLogSchema.statics.logWarehouseAction = function(action, warehouseRecord, user, changes = [], metadata = {}) {
  return this.create({
    action,
    entityType: 'warehouse_approval',
    entityId: warehouseRecord._id,
    entityNumber: warehouseRecord.warehouseApprovalNumber,
    performedBy: user._id,
    performedByName: user.name,
    performedByRole: user.role,
    description: this.getActionDescription(action, warehouseRecord),
    category: this.getCategoryFromAction(action),
    changes,
    metadata: {
      ...metadata,
      module: 'warehouse_approval',
      workflow: 'warehouse_workflow'
    },
    relatedEntities: [{
      entityType: 'quality_control',
      entityId: warehouseRecord.qualityControl,
      relationship: 'parent'
    }]
  });
};

auditLogSchema.statics.logInventoryAction = function(action, inventoryRecord, user, changes = [], metadata = {}) {
  return this.create({
    action,
    entityType: 'inventory',
    entityId: inventoryRecord._id,
    entityNumber: inventoryRecord.productCode || inventoryRecord._id.toString(),
    performedBy: user._id,
    performedByName: user.name,
    performedByRole: user.role,
    description: this.getActionDescription(action, inventoryRecord),
    category: this.getCategoryFromAction(action),
    changes,
    metadata: {
      ...metadata,
      module: 'inventory',
      workflow: 'inventory_management'
    }
  });
};

// Helper methods
auditLogSchema.statics.getActionDescription = function(action, entity) {
  const descriptions = {
    qc_created: `QC record ${entity.qcNumber} created`,
    qc_assigned: `QC record ${entity.qcNumber} assigned`,
    qc_started: `QC process started for ${entity.qcNumber}`,
    qc_submitted: `QC record ${entity.qcNumber} submitted for approval`,
    qc_approved: `QC record ${entity.qcNumber} approved`,
    qc_rejected: `QC record ${entity.qcNumber} rejected`,
    
    warehouse_approval_created: `Warehouse approval ${entity.warehouseApprovalNumber} created`,
    warehouse_approval_assigned: `Warehouse approval ${entity.warehouseApprovalNumber} assigned`,
    warehouse_approval_started: `Warehouse approval process started for ${entity.warehouseApprovalNumber}`,
    warehouse_approval_submitted: `Warehouse approval ${entity.warehouseApprovalNumber} submitted`,
    warehouse_manager_approved: `Warehouse approval ${entity.warehouseApprovalNumber} approved by manager`,
    warehouse_manager_rejected: `Warehouse approval ${entity.warehouseApprovalNumber} rejected by manager`,
    
    inventory_created: `Inventory record created for ${entity.productName}`,
    inventory_updated: `Inventory record updated for ${entity.productName}`,
    stock_adjusted: `Stock adjusted for ${entity.productName}`,
    stock_reserved: `Stock reserved for ${entity.productName}`,
    stock_released: `Stock released for ${entity.productName}`
  };
  
  return descriptions[action] || `${action} performed on ${entity._id}`;
};

auditLogSchema.statics.getCategoryFromAction = function(action) {
  if (action.includes('created')) return 'create';
  if (action.includes('approved') || action.includes('rejected')) return 'approve';
  if (action.includes('assigned')) return 'assign';
  if (action.includes('updated') || action.includes('adjusted')) return 'update';
  if (action.includes('deleted')) return 'delete';
  if (action.includes('transferred')) return 'transfer';
  return 'update';
};

// Method to get audit trail for an entity
auditLogSchema.statics.getAuditTrail = function(entityType, entityId, options = {}) {
  const query = { entityType, entityId };
  
  if (options.startDate) {
    query.createdAt = { $gte: options.startDate };
  }
  if (options.endDate) {
    query.createdAt = { ...query.createdAt, $lte: options.endDate };
  }
  if (options.actions) {
    query.action = { $in: options.actions };
  }
  if (options.performedBy) {
    query.performedBy = options.performedBy;
  }
  
  return this.find(query)
    .populate('performedBy', 'name email role')
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

export default mongoose.model('AuditLog', auditLogSchema);