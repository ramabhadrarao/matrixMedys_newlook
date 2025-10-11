// server/models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Notification Details
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'qc_assignment',
      'qc_completed',
      'qc_failed',
      'warehouse_assignment',
      'warehouse_approved',
      'warehouse_rejected',
      'inventory_updated',
      'approval_required',
      'workflow_completed',
      'system_alert',
      'low_stock',
      'near_expiry',
      'expired_items'
    ],
    required: true
  },
  
  // Priority and Status
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread'
  },
  
  // Recipients
  recipients: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['unread', 'read', 'archived'], default: 'unread' },
    readAt: Date,
    archivedAt: Date
  }],
  
  // Reference Information
  referenceType: {
    type: String,
    enum: [
      'invoice_receiving',
      'quality_control',
      'warehouse_approval',
      'inventory',
      'purchase_order',
      'system'
    ]
  },
  referenceId: mongoose.Schema.Types.ObjectId,
  referenceNumber: String,
  
  // Additional Data
  data: mongoose.Schema.Types.Mixed, // Additional context data
  
  // Actions
  actions: [{
    label: String,
    action: String, // URL or action identifier
    style: { type: String, enum: ['primary', 'secondary', 'success', 'warning', 'danger'], default: 'primary' }
  }],
  
  // Scheduling
  scheduledAt: Date, // For scheduled notifications
  expiresAt: Date, // Auto-archive after this date
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  
}, { timestamps: true });

// Indexes for performance
notificationSchema.index({ 'recipients.user': 1, 'recipients.status': 1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ referenceType: 1, referenceId: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired notifications

// Methods
notificationSchema.methods.markAsRead = function(userId) {
  const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
  if (recipient) {
    recipient.status = 'read';
    recipient.readAt = new Date();
  }
  return this.save();
};

notificationSchema.methods.markAsArchived = function(userId) {
  const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
  if (recipient) {
    recipient.status = 'archived';
    recipient.archivedAt = new Date();
  }
  return this.save();
};

// Static methods for creating specific notification types
notificationSchema.statics.createQCAssignment = function(qcRecord, assignedUser) {
  return this.create({
    title: 'QC Assignment',
    message: `Quality Control ${qcRecord.qcNumber} has been assigned to you`,
    type: 'qc_assignment',
    priority: qcRecord.priority || 'medium',
    recipients: [{ user: assignedUser }],
    referenceType: 'quality_control',
    referenceId: qcRecord._id,
    referenceNumber: qcRecord.qcNumber,
    data: {
      invoiceNumber: qcRecord.invoiceReceiving?.invoiceNumber,
      productCount: qcRecord.products?.length || 0
    },
    actions: [{
      label: 'View QC Record',
      action: `/qc/${qcRecord._id}`,
      style: 'primary'
    }]
  });
};

notificationSchema.statics.createWarehouseAssignment = function(warehouseRecord, assignedUser) {
  return this.create({
    title: 'Warehouse Approval Assignment',
    message: `Warehouse Approval ${warehouseRecord.warehouseApprovalNumber} has been assigned to you`,
    type: 'warehouse_assignment',
    priority: warehouseRecord.priority || 'medium',
    recipients: [{ user: assignedUser }],
    referenceType: 'warehouse_approval',
    referenceId: warehouseRecord._id,
    referenceNumber: warehouseRecord.warehouseApprovalNumber,
    data: {
      qcNumber: warehouseRecord.qualityControl?.qcNumber,
      productCount: warehouseRecord.products?.length || 0
    },
    actions: [{
      label: 'View Warehouse Approval',
      action: `/warehouse-approval/${warehouseRecord._id}`,
      style: 'primary'
    }]
  });
};

notificationSchema.statics.createInventoryAlert = function(alertType, inventoryItems, recipients) {
  const titles = {
    low_stock: 'Low Stock Alert',
    near_expiry: 'Near Expiry Alert',
    expired_items: 'Expired Items Alert'
  };
  
  const messages = {
    low_stock: `${inventoryItems.length} items are running low on stock`,
    near_expiry: `${inventoryItems.length} items are nearing expiry`,
    expired_items: `${inventoryItems.length} items have expired`
  };
  
  return this.create({
    title: titles[alertType],
    message: messages[alertType],
    type: alertType,
    priority: alertType === 'expired_items' ? 'urgent' : 'high',
    recipients: recipients.map(user => ({ user })),
    referenceType: 'inventory',
    data: {
      itemCount: inventoryItems.length,
      items: inventoryItems.map(item => ({
        productName: item.productName,
        batchNo: item.batchNo,
        currentStock: item.currentStock,
        expDate: item.expDate
      }))
    },
    actions: [{
      label: 'View Inventory',
      action: '/inventory',
      style: 'warning'
    }]
  });
};

export default mongoose.model('Notification', notificationSchema);