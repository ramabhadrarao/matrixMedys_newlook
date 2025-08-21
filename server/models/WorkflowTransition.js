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

export default mongoose.model('WorkflowTransition', workflowTransitionSchema);

// server/models/StagePermission.js
import mongoose from 'mongoose';

const stagePermissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowStage',
    required: true
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  expiryDate: Date,
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

stagePermissionSchema.index({ userId: 1, stageId: 1 }, { unique: true });

export default mongoose.model('StagePermission', stagePermissionSchema);