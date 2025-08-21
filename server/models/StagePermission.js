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
  expiryDate: {
    type: Date,
    default: null
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  remarks: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

// Compound index for unique user-stage combination
stagePermissionSchema.index({ userId: 1, stageId: 1 }, { unique: true });

// Index for expired permissions cleanup
stagePermissionSchema.index({ expiryDate: 1 });

// Index for performance
stagePermissionSchema.index({ isActive: 1 });

// Virtual to check if permission is expired
stagePermissionSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

// Virtual to check if permission is valid
stagePermissionSchema.virtual('isValid').get(function() {
  return this.isActive && !this.isExpired;
});

// Method to check if user has specific permission
stagePermissionSchema.methods.hasPermission = function(permissionId) {
  return this.permissions.some(p => p.toString() === permissionId.toString());
};

// Static method to get active permissions for a user
stagePermissionSchema.statics.getActivePermissions = async function(userId, stageId) {
  const now = new Date();
  return await this.findOne({
    userId,
    stageId,
    isActive: true,
    $or: [
      { expiryDate: null },
      { expiryDate: { $gt: now } }
    ]
  }).populate('permissions');
};

// Static method to check if user can perform action on stage
stagePermissionSchema.statics.canPerformAction = async function(userId, stageId, action) {
  const stagePermission = await this.getActivePermissions(userId, stageId);
  if (!stagePermission) return false;
  
  // Check if user has required permission for the action
  const WorkflowStage = mongoose.model('WorkflowStage');
  const stage = await WorkflowStage.findById(stageId).populate('requiredPermissions');
  
  if (!stage) return false;
  
  // Check if the action is allowed in this stage
  if (!stage.allowedActions.includes(action)) return false;
  
  // Check if user has all required permissions
  const userPermissionIds = stagePermission.permissions.map(p => p.toString());
  const requiredPermissionIds = stage.requiredPermissions.map(p => p.toString());
  
  return requiredPermissionIds.every(reqPerm => userPermissionIds.includes(reqPerm));
};

// Static method to bulk assign permissions
stagePermissionSchema.statics.bulkAssign = async function(assignments, assignedBy) {
  const operations = assignments.map(assignment => ({
    updateOne: {
      filter: { 
        userId: assignment.userId, 
        stageId: assignment.stageId 
      },
      update: {
        $set: {
          permissions: assignment.permissions,
          expiryDate: assignment.expiryDate,
          assignedBy: assignedBy,
          isActive: true,
          remarks: assignment.remarks
        }
      },
      upsert: true
    }
  }));
  
  return await this.bulkWrite(operations);
};

// Pre-save hook to validate expiry date
stagePermissionSchema.pre('save', function(next) {
  if (this.expiryDate && this.expiryDate < new Date()) {
    next(new Error('Expiry date cannot be in the past'));
  }
  next();
});

// Ensure virtual fields are serialized
stagePermissionSchema.set('toJSON', { virtuals: true });
stagePermissionSchema.set('toObject', { virtuals: true });

export default mongoose.model('StagePermission', stagePermissionSchema);