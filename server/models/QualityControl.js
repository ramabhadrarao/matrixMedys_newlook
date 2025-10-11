// server/models/QualityControl.js
import mongoose from 'mongoose';

// QC Item Detail Schema - for individual product items within a batch
const qcItemDetailSchema = new mongoose.Schema({
  itemNumber: { type: Number, required: true },
  status: {
    type: String,
    enum: [
      'pending', 
      'passed', 
      'failed',
      // Legacy values for backward compatibility
      'received_correctly',
      'damaged_packaging',
      'damaged_product', 
      'expired',
      'near_expiry',
      'wrong_product',
      'wrong_quantity',
      'missing_documents',
      'temperature_issue',
      'contaminated',
      'defective',
      'rejected'
    ],
    default: 'pending'
  },
  qcReasons: [{
    type: String,
    enum: [
      'received_correctly',
      'damaged_packaging',
      'damaged_product',
      'expired',
      'near_expiry',
      'wrong_product',
      'quantity_mismatch',
      'quality_issue',
      'labeling_issue',
      'other'
    ]
  }],
  remarks: { type: String, trim: true },
  qcDate: Date,
  qcBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// QC Product Schema
const qcProductSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productCode: String,
  productName: String,
  batchNo: String,
  mfgDate: Date,
  expDate: Date,
  receivedQty: { type: Number, required: true },
  qcQty: { type: Number, default: 0 },
  passedQty: { type: Number, default: 0 },
  failedQty: { type: Number, default: 0 },
  
  overallStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'passed', 'failed', 'partial_pass'],
    default: 'pending'
  },
  
  itemDetails: [qcItemDetailSchema],
  
  qcSummary: {
    received_correctly: { type: Number, default: 0 },
    damaged_packaging: { type: Number, default: 0 },
    damaged_product: { type: Number, default: 0 },
    expired: { type: Number, default: 0 },
    near_expiry: { type: Number, default: 0 },
    wrong_product: { type: Number, default: 0 },
    quantity_mismatch: { type: Number, default: 0 },
    quality_issue: { type: Number, default: 0 },
    labeling_issue: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  
  qcBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qcDate: Date
});

// Main QC Schema
const qualityControlSchema = new mongoose.Schema({
  qcNumber: {
    type: String,
    unique: true,
    required: true
  },
  
  invoiceReceiving: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvoiceReceiving',
    required: true
  },
  
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: false // Made optional for backward compatibility
  },
  
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'pending_approval', 'completed', 'rejected', 'on_hold', 'cancelled'],
    default: 'pending'
  },
  
  qcType: {
    type: String,
    enum: [
      'standard', 
      'urgent', 
      'special',
      // Legacy values for backward compatibility
      'incoming_inspection', 
      'batch_testing', 
      'random_sampling', 
      'full_inspection'
    ],
    default: 'standard'
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  products: [qcProductSchema],
  
  overallResult: {
    type: String,
    enum: ['pending', 'passed', 'failed', 'partial_pass'],
    default: 'pending'
  },
  
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  qcEnvironment: {
    temperature: Number,
    humidity: Number,
    lightCondition: { type: String, enum: ['normal', 'bright', 'dim'], default: 'normal' }
  },
  
  qcDate: Date,
  qcBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qcRemarks: String,
  
  approvalDate: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalRemarks: String,
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Pre-save hook to normalize legacy values
qualityControlSchema.pre('save', async function(next) {
  // Auto-generate QC Number
  if (this.isNew && !this.qcNumber) {
    const count = await mongoose.models.QualityControl.countDocuments();
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    this.qcNumber = `QC-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
  
  // Normalize qcType
  const qcTypeMapping = {
    'incoming_inspection': 'standard',
    'batch_testing': 'standard',
    'random_sampling': 'standard',
    'full_inspection': 'special'
  };
  if (qcTypeMapping[this.qcType]) {
    this.qcType = qcTypeMapping[this.qcType];
  }
  
  // Normalize item status values
  this.products.forEach(product => {
    product.itemDetails.forEach(item => {
      // Convert legacy status to new format
      if (item.status === 'received_correctly') {
        item.status = 'passed';
      } else if (item.status && item.status !== 'pending' && item.status !== 'passed' && item.status !== 'failed') {
        // Any other legacy status becomes 'failed'
        item.status = 'failed';
      }
    });
  });
  
  next();
});

// Indexes
qualityControlSchema.index({ invoiceReceiving: 1 });
qualityControlSchema.index({ purchaseOrder: 1 });
qualityControlSchema.index({ qcNumber: 1 });
qualityControlSchema.index({ status: 1 });
qualityControlSchema.index({ overallResult: 1 });
qualityControlSchema.index({ assignedTo: 1 });
qualityControlSchema.index({ createdAt: -1 });

export default mongoose.model('QualityControl', qualityControlSchema);