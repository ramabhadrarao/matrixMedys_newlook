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
    enum: ['approve', 'reject', 'return', 'cancel', 'receive', 'qc_check', 'complete']
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