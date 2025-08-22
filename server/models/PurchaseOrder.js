// server/models/PurchaseOrder.js
import mongoose from 'mongoose';

const productLineSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productCode: String,
  productName: String,
  description: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  foc: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountType: {
    type: String,
    enum: ['percentage', 'amount'],
    default: 'amount'
  },
  unit: {
    type: String,
    default: 'PCS'
  },
  gstRate: {
    type: Number,
    default: 18
  },
  totalCost: {
    type: Number,
    default: 0
  },
  remarks: String,
  receivedQty: {
    type: Number,
    default: 0
  },
  backlogQty: {
    type: Number,
    default: 0
  }
});

const addressSchema = new mongoose.Schema({
  branchWarehouse: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  gstin: String,
  drugLicense: String,
  phone: String
});

const workflowHistorySchema = new mongoose.Schema({
  stage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowStage'
  },
  action: {
    type: String,
    required: true
  },
  actionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actionDate: {
    type: Date,
    default: Date.now
  },
  remarks: String,
  changes: mongoose.Schema.Types.Mixed
});

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    required: true,
    unique: true
  },
  poDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  principal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Principal',
    required: true
  },
  billTo: {
    type: addressSchema,
    required: true
  },
  shipTo: {
    type: addressSchema,
    required: true
  },
  products: [productLineSchema],
  
  // Financial fields
  subTotal: {
    type: Number,
    default: 0
  },
  productLevelDiscount: {
    type: Number,
    default: 0
  },
  additionalDiscount: {
    type: {
      type: String,
      enum: ['percentage', 'amount'],
      default: 'amount'
    },
    value: {
      type: Number,
      default: 0
    }
  },
  taxType: {
    type: String,
    enum: ['IGST', 'CGST_SGST'],
    default: 'IGST'
  },
  gstRate: {
    type: Number,
    default: 5
  },
  cgst: {
    type: Number,
    default: 0
  },
  sgst: {
    type: Number,
    default: 0
  },
  igst: {
    type: Number,
    default: 0
  },
  shippingCharges: {
    type: {
      type: String,
      enum: ['percentage', 'amount'],
      default: 'amount'
    },
    value: {
      type: Number,
      default: 0
    }
  },
  grandTotal: {
    type: Number,
    default: 0
  },
  
  // Communication
  toEmails: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  fromEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  ccEmails: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  
  // Additional info
  terms: String,
  notes: String,
  
  // Workflow
  currentStage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowStage'
  },
  workflowHistory: [workflowHistorySchema],
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'ordered', 
            'partial_received', 'received', 'qc_pending', 'qc_passed', 
            'qc_failed', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: Date
}, {
  timestamps: true
});

// Calculate totals method
purchaseOrderSchema.methods.calculateTotals = function() {
  let subTotal = 0;
  let productLevelDiscount = 0;
  
  // Calculate product totals
  this.products.forEach(product => {
    const qty = product.quantity - (product.foc || 0);
    const baseAmount = qty * product.unitPrice;
    
    let discount = 0;
    if (product.discountType === 'percentage') {
      discount = (baseAmount * product.discount) / 100;
    } else {
      discount = product.discount || 0;
    }
    
    productLevelDiscount += discount;
    const lineTotal = baseAmount - discount;
    product.totalCost = lineTotal;
    subTotal += lineTotal;
  });
  
  this.subTotal = subTotal;
  this.productLevelDiscount = productLevelDiscount;
  
  // Apply additional discount
  let totalAfterDiscount = subTotal;
  if (this.additionalDiscount && this.additionalDiscount.value > 0) {
    if (this.additionalDiscount.type === 'percentage') {
      totalAfterDiscount -= (totalAfterDiscount * this.additionalDiscount.value) / 100;
    } else {
      totalAfterDiscount -= this.additionalDiscount.value;
    }
  }
  
  // Calculate GST
  const gstAmount = (totalAfterDiscount * this.gstRate) / 100;
  
  if (this.taxType === 'CGST_SGST') {
    this.cgst = gstAmount / 2;
    this.sgst = gstAmount / 2;
    this.igst = 0;
  } else {
    this.cgst = 0;
    this.sgst = 0;
    this.igst = gstAmount;
  }
  
  // Calculate shipping charges
  let shippingAmount = 0;
  if (this.shippingCharges && this.shippingCharges.value > 0) {
    if (this.shippingCharges.type === 'percentage') {
      shippingAmount = (totalAfterDiscount * this.shippingCharges.value) / 100;
    } else {
      shippingAmount = this.shippingCharges.value;
    }
  }
  
  // Calculate grand total
  this.grandTotal = totalAfterDiscount + gstAmount + shippingAmount;
  
  return this;
};

// Virtual for checking if fully received
purchaseOrderSchema.virtual('isFullyReceived').get(function() {
  return this.products.every(product => 
    product.receivedQty >= (product.quantity - product.foc)
  );
});

// Virtual for total received quantity
purchaseOrderSchema.virtual('totalReceivedQty').get(function() {
  return this.products.reduce((sum, product) => 
    sum + (product.receivedQty || 0), 0
  );
});

// Virtual for total backlog quantity
purchaseOrderSchema.virtual('totalBacklogQty').get(function() {
  return this.products.reduce((sum, product) => 
    sum + (product.backlogQty || 0), 0
  );
});

// Indexes
purchaseOrderSchema.index({ poNumber: 1 });
purchaseOrderSchema.index({ principal: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ createdAt: -1 });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

export default PurchaseOrder;