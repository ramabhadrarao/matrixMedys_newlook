// server/models/QualityControl.js
import mongoose from 'mongoose';

// QC Item Detail Schema - for individual product items within a batch
const qcItemDetailSchema = new mongoose.Schema({
  itemNumber: { type: Number, required: true }, // Item number within the batch (1, 2, 3, etc.)
  status: {
    type: String,
    enum: [
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
    required: true
  },
  reason: { type: String, trim: true }, // Detailed reason for the status
  images: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  remarks: { type: String, trim: true }
});

// QC Product Schema - for each product in the invoice receiving
const qcProductSchema = new mongoose.Schema({
  invoiceReceivingProduct: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true // Reference to the product in InvoiceReceiving
  },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productCode: String,
  productName: String,
  batchNo: String,
  mfgDate: Date,
  expDate: Date,
  
  // Quantities
  receivedQty: { type: Number, required: true },
  qcPassedQty: { type: Number, default: 0 },
  qcFailedQty: { type: Number, default: 0 },
  qcPendingQty: { type: Number, default: 0 },
  
  // Overall QC Status for this product
  overallStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'passed', 'failed', 'partial_pass'],
    default: 'pending'
  },
  
  // Detailed item-level QC results
  itemDetails: [qcItemDetailSchema],
  
  // QC Summary
  qcSummary: {
    correctlyReceived: { type: Number, default: 0 },
    damaged: { type: Number, default: 0 },
    expired: { type: Number, default: 0 },
    nearExpiry: { type: Number, default: 0 },
    wrongProduct: { type: Number, default: 0 },
    wrongQuantity: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  
  // QC Decision
  qcDecision: {
    type: String,
    enum: ['accept_all', 'accept_partial', 'reject_all', 'return_to_supplier'],
    default: null
  },
  qcRemarks: String,
  
  // QC Personnel
  qcBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qcDate: Date,
  qcStartTime: Date,
  qcEndTime: Date
});

// Main QC Schema
const qualityControlSchema = new mongoose.Schema({
  // Reference to Invoice Receiving
  invoiceReceiving: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvoiceReceiving',
    required: true
  },
  
  // QC Information
  qcNumber: {
    type: String,
    unique: true,
    required: true
  },
  
  // QC Status
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'],
    default: 'pending'
  },
  
  // QC Type
  qcType: {
    type: String,
    enum: ['incoming_inspection', 'batch_testing', 'random_sampling', 'full_inspection'],
    default: 'incoming_inspection'
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Products being QC'd
  products: [qcProductSchema],
  
  // Overall QC Results
  overallResult: {
    type: String,
    enum: ['passed', 'failed', 'partial_pass', 'pending'],
    default: 'pending'
  },
  
  // QC Personnel
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qcTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // QC Timeline
  scheduledDate: Date,
  startedAt: Date,
  completedAt: Date,
  
  // QC Environment
  temperature: Number,
  humidity: Number,
  environmentRemarks: String,
  
  // Documents and Evidence
  qcDocuments: [{
    name: String,
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // QC Checklist (customizable based on product type)
  checklist: [{
    item: String,
    status: { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
    remarks: String
  }],
  
  // Final QC Report
  qcReport: {
    summary: String,
    recommendations: String,
    nextActions: String,
    approvalRequired: { type: Boolean, default: false }
  },
  
  // Approval Workflow
  approvals: [{
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    remarks: String,
    approvedAt: Date,
    level: Number // 1, 2, 3 for multi-level approval
  }],
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  
}, { timestamps: true });

// Auto-generate QC Number
qualityControlSchema.pre('save', async function(next) {
  if (this.isNew && !this.qcNumber) {
    const count = await mongoose.models.QualityControl.countDocuments();
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    this.qcNumber = `QC-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Update QC summary when item details change
qualityControlSchema.methods.updateQcSummary = function(productIndex) {
  const product = this.products[productIndex];
  if (!product) return;
  
  // Reset summary
  product.qcSummary = {
    correctlyReceived: 0,
    damaged: 0,
    expired: 0,
    nearExpiry: 0,
    wrongProduct: 0,
    wrongQuantity: 0,
    other: 0
  };
  
  // Count items by status
  product.itemDetails.forEach(item => {
    switch(item.status) {
      case 'received_correctly':
        product.qcSummary.correctlyReceived++;
        break;
      case 'damaged_packaging':
      case 'damaged_product':
      case 'defective':
        product.qcSummary.damaged++;
        break;
      case 'expired':
        product.qcSummary.expired++;
        break;
      case 'near_expiry':
        product.qcSummary.nearExpiry++;
        break;
      case 'wrong_product':
        product.qcSummary.wrongProduct++;
        break;
      case 'wrong_quantity':
        product.qcSummary.wrongQuantity++;
        break;
      default:
        product.qcSummary.other++;
    }
  });
  
  // Update quantities
  product.qcPassedQty = product.qcSummary.correctlyReceived;
  product.qcFailedQty = product.receivedQty - product.qcPassedQty;
  
  // Update overall status
  if (product.qcPassedQty === product.receivedQty) {
    product.overallStatus = 'passed';
  } else if (product.qcPassedQty === 0) {
    product.overallStatus = 'failed';
  } else {
    product.overallStatus = 'partial_pass';
  }
};

// Update overall QC result
qualityControlSchema.methods.updateOverallResult = function() {
  const totalProducts = this.products.length;
  const passedProducts = this.products.filter(p => p.overallStatus === 'passed').length;
  const failedProducts = this.products.filter(p => p.overallStatus === 'failed').length;
  
  if (passedProducts === totalProducts) {
    this.overallResult = 'passed';
  } else if (failedProducts === totalProducts) {
    this.overallResult = 'failed';
  } else {
    this.overallResult = 'partial_pass';
  }
};

// Indexes for performance
qualityControlSchema.index({ invoiceReceiving: 1 });
qualityControlSchema.index({ qcNumber: 1 });
qualityControlSchema.index({ status: 1 });
qualityControlSchema.index({ assignedTo: 1 });
qualityControlSchema.index({ createdAt: -1 });

export default mongoose.model('QualityControl', qualityControlSchema);