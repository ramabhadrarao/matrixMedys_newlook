// server/models/WorkflowStage.js
import mongoose from 'mongoose';

const workflowStageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  description: String,
  sequence: {
    type: Number,
    required: true,
    default: 1
  },
  requiredPermissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  allowedActions: [{
    type: String,
    enum: ['edit', 'approve', 'reject', 'return', 'cancel', 'receive', 'qc_check']
  }],
  nextStages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowStage'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for quick lookups
// workflowStageSchema.index({ code: 1 });
workflowStageSchema.index({ sequence: 1 });

const WorkflowStage = mongoose.model('WorkflowStage', workflowStageSchema);

export default WorkflowStage;