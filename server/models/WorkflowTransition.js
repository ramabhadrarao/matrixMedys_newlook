// server/models/WorkflowTransition.js
import mongoose from 'mongoose';

const workflowTransitionSchema = new mongoose.Schema({
  fromStage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowStage',
    required: true
  },
  toStage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowStage',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'approve', 'reject', 'return', 'cancel', 'receive', 'qc_check', 'complete',
      'qc_assign', 'qc_start', 'qc_submit', 'qc_approve', 'qc_reject',
      'warehouse_assign', 'warehouse_inspect', 'warehouse_approve', 
      'warehouse_reject', 'warehouse_complete', 'inventory_create',
      'inventory_update', 'stock_adjust', 'notification_send'
    ]
  },
  conditions: mongoose.Schema.Types.Mixed,
  autoTransition: {
    type: Boolean,
    default: false
  },
  requiredFields: [String],
  notificationTemplate: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Index for performance
workflowTransitionSchema.index({ fromStage: 1, toStage: 1 });
workflowTransitionSchema.index({ action: 1 });

export default mongoose.model('WorkflowTransition', workflowTransitionSchema);