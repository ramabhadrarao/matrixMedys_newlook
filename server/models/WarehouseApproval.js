// server/models/WarehouseApproval.js
import mongoose from 'mongoose';

// Warehouse Product Schema - for each QC-passed product awaiting warehouse approval
const warehouseProductSchema = new mongoose.Schema({
  qualityControlProduct: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true // Reference to the product in QualityControl
  },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productCode: String,
  productName: String,
  batchNo: String,
  mfgDate: Date,
  expDate: Date,
  
  // Quantities from QC
  qcPassedQty: { type: Number, required: true },
  warehouseApprovedQty: { type: Number, default: 0 },
  warehouseRejectedQty: { type: Number, default: 0 },
  warehousePendingQty: { type: Number, default: 0 },
  
  // Warehouse Inspection Results
  warehouseStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'partial_approved', 'on_hold'],
    default: 'pending'
  },
  
  // Storage Information
  proposedLocation: {
    zone: String, // A, B, C zones
    rack: String, // R001, R002
    shelf: String, // S01, S02
    bin: String // B001, B002
  },
  
  actualLocation: {
    zone: String,
    rack: String, 
    shelf: String,
    bin: String
  },
  
  // Storage Conditions
  storageConditions: {
    temperature: { min: Number, max: Number, unit: { type: String, default: '°C' } },
    humidity: { min: Number, max: Number, unit: { type: String, default: '%' } },
    lightCondition: { type: String, enum: ['dark', 'normal', 'protected'], default: 'normal' },
    specialRequirements: String
  },
  
  // Warehouse Checks
  warehouseChecks: [{
    checkType: {
      type: String,
      enum: [
        'storage_space_availability',
        'temperature_compliance',
        'humidity_compliance', 
        'expiry_date_verification',
        'batch_segregation',
        'fifo_compliance',
        'documentation_complete',
        'barcode_verification',
        'physical_condition',
        'packaging_integrity'
      ],
      required: true
    },
    status: { type: String, enum: ['pass', 'fail', 'na'], required: true },
    remarks: String,
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    checkedAt: { type: Date, default: Date.now }
  }],
  
  // Warehouse Decision
  warehouseDecision: {
    type: String,
    enum: ['accept_all', 'accept_partial', 'reject_all', 'return_to_qc', 'hold_for_review'],
    default: null
  },
  warehouseRemarks: String,
  
  // Rejection Reasons (if any)
  rejectionReasons: [{
    reason: {
      type: String,
      enum: [
        'insufficient_storage_space',
        'temperature_non_compliance',
        'humidity_non_compliance',
        'near_expiry_concern',
        'batch_conflict',
        'documentation_incomplete',
        'physical_damage_found',
        'packaging_compromise',
        'barcode_mismatch',
        'other'
      ]
    },
    description: String,
    quantity: Number
  }],
  
  // Images and Evidence
  warehouseImages: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    description: String, // Storage location, condition, etc.
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Warehouse Personnel
  inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  inspectionDate: Date,
  approvalDate: Date
});

// Main Warehouse Approval Schema
const warehouseApprovalSchema = new mongoose.Schema({
  // Reference to Quality Control
  qualityControl: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QualityControl',
    required: true
  },
  
  // Reference to Invoice Receiving (for traceability)
  invoiceReceiving: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvoiceReceiving',
    required: true
  },
  
  // Warehouse Information
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  
  // Warehouse Approval Information
  warehouseApprovalNumber: {
    type: String,
    unique: true,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'],
    default: 'pending'
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Products for warehouse approval
  products: [warehouseProductSchema],
  
  // Overall Warehouse Results
  overallResult: {
    type: String,
    enum: ['approved', 'rejected', 'partial_approved', 'pending'],
    default: 'pending'
  },
  
  // Warehouse Personnel
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  warehouseTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Timeline
  scheduledDate: Date,
  startedAt: Date,
  completedAt: Date,
  
  // Warehouse Environment at time of inspection
  environmentConditions: {
    temperature: Number,
    humidity: Number,
    remarks: String,
    recordedAt: { type: Date, default: Date.now }
  },
  
  // Documents
  warehouseDocuments: [{
    name: String,
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Manager Approval (Multi-level approval)
  managerApprovals: [{
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    level: Number, // 1 = Warehouse Supervisor, 2 = Warehouse Manager, 3 = Operations Manager
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    remarks: String,
    approvedAt: Date,
    conditions: String // Any conditions for approval
  }],
  
  // Final Warehouse Report
  warehouseReport: {
    summary: String,
    storageRecommendations: String,
    specialInstructions: String,
    nextActions: String
  },
  
  // Integration with Inventory
  inventoryIntegrationStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  inventoryIntegrationDate: Date,
  inventoryReference: String, // Reference to inventory entry
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  
}, { timestamps: true });

// Auto-generate Warehouse Approval Number
warehouseApprovalSchema.pre('save', async function(next) {
  if (this.isNew && !this.warehouseApprovalNumber) {
    const count = await mongoose.models.WarehouseApproval.countDocuments();
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    this.warehouseApprovalNumber = `WA-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Update overall warehouse result
warehouseApprovalSchema.methods.updateOverallResult = function() {
  const totalProducts = this.products.length;
  const approvedProducts = this.products.filter(p => p.warehouseStatus === 'approved').length;
  const rejectedProducts = this.products.filter(p => p.warehouseStatus === 'rejected').length;
  
  if (approvedProducts === totalProducts) {
    this.overallResult = 'approved';
  } else if (rejectedProducts === totalProducts) {
    this.overallResult = 'rejected';
  } else if (approvedProducts > 0) {
    this.overallResult = 'partial_approved';
  } else {
    this.overallResult = 'pending';
  }
};

// Check if all manager approvals are complete
warehouseApprovalSchema.methods.isManagerApprovalComplete = function() {
  if (this.managerApprovals.length === 0) return false;
  return this.managerApprovals.every(approval => approval.status === 'approved');
};

// Get next required approval level
warehouseApprovalSchema.methods.getNextApprovalLevel = function() {
  const approvedLevels = this.managerApprovals
    .filter(approval => approval.status === 'approved')
    .map(approval => approval.level);
  
  const maxApprovedLevel = approvedLevels.length > 0 ? Math.max(...approvedLevels) : 0;
  return maxApprovedLevel + 1;
};

// Indexes for performance
warehouseApprovalSchema.index({ qualityControl: 1 });
warehouseApprovalSchema.index({ invoiceReceiving: 1 });
warehouseApprovalSchema.index({ warehouse: 1 });
warehouseApprovalSchema.index({ warehouseApprovalNumber: 1 });
warehouseApprovalSchema.index({ status: 1 });
warehouseApprovalSchema.index({ assignedTo: 1 });
warehouseApprovalSchema.index({ createdAt: -1 });

export default mongoose.model('WarehouseApproval', warehouseApprovalSchema);