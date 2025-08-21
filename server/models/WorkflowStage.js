// server/models/WorkflowStage.js
import mongoose from 'mongoose';

const workflowStageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: String,
  sequence: {
    type: Number,
    required: true,
    unique: true
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
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('WorkflowStage', workflowStageSchema);