// server/models/BranchContact.js
import mongoose from 'mongoose';

const branchContactSchema = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    default: null, // null means this contact is for the branch itself
  },
  contactPersonName: {
    type: String,
    required: true,
    trim: true,
  },
  department: {
    type: String,
    required: true,
    enum: ['Admin', 'Operations', 'Sales', 'Logistics'],
    trim: true,
  },
  designation: {
    type: String,
    required: true,
    trim: true, // Manager, Supervisor, Owner etc.
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
  },
  alternateContactPerson: {
    type: String,
    trim: true, // backup contact person
  },
  emailAddress: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes for performance
branchContactSchema.index({ branch: 1, department: 1 });
branchContactSchema.index({ warehouse: 1 });
branchContactSchema.index({ contactPersonName: 'text', emailAddress: 'text' });
branchContactSchema.index({ isActive: 1 });

// Compound index for branch and warehouse contacts
branchContactSchema.index({ branch: 1, warehouse: 1, department: 1 });

// Virtual to determine if this is a branch or warehouse contact
branchContactSchema.virtual('contactType').get(function() {
  return this.warehouse ? 'warehouse' : 'branch';
});

// Set virtuals to be included in JSON
branchContactSchema.set('toJSON', { virtuals: true });
branchContactSchema.set('toObject', { virtuals: true });

// Static method to get contacts for a branch
branchContactSchema.statics.getBranchContacts = function(branchId) {
  return this.find({ branch: branchId, warehouse: null, isActive: true })
    .populate('branch', 'name branchCode')
    .sort({ department: 1, contactPersonName: 1 });
};

// Static method to get contacts for a warehouse
branchContactSchema.statics.getWarehouseContacts = function(warehouseId) {
  return this.find({ warehouse: warehouseId, isActive: true })
    .populate('branch', 'name branchCode')
    .populate('warehouse', 'name warehouseCode')
    .sort({ department: 1, contactPersonName: 1 });
};

// Static method to get all contacts for a branch (including warehouse contacts)
branchContactSchema.statics.getAllBranchContacts = function(branchId) {
  return this.find({ branch: branchId, isActive: true })
    .populate('branch', 'name branchCode')
    .populate('warehouse', 'name warehouseCode')
    .sort({ warehouse: 1, department: 1, contactPersonName: 1 });
};

export default mongoose.model('BranchContact', branchContactSchema);