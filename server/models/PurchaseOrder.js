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
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  foc: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: { type: String, enum: ['percentage', 'amount'], default: 'amount' },
    value: { type: Number, default: 0, min: 0 }
  },
  totalCost: Number,
  remarks: String,
  
  // Receiving tracking
  receivedQty: { type: Number, default: 0 },
  backlogQty: { type: Number, default: 0 },
  receivingHistory: [{
    receivedQty: Number,
    receivedDate: Date,
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    invoiceNumber: String,
    batchNo: String,
    mfgDate: Date,
    expDate: Date,
    remarks: String,
    createdAt: { type: Date, default: Date.now }
  }]
});

const workflowHistorySchema = new mongoose.Schema({
  stage: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowStage' },
  action: String,
  actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actionDate: { type: Date, default: Date.now },
  remarks: String,
  changes: mongoose.Schema.Types.Mixed
});

const purchaseOrderSchema = new mongoose.Schema({
  // PO Identification
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
  
  // Principal/Supplier
  principal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Principal',
    required: true
  },
  
  // Billing & Shipping
  billTo: {
    branchWarehouse: String,
    name: { type: String, default: 'MATRYX MEDISYS PRIVATE LIMITED' },
    address: String,
    gstin: String,
    drugLicense: String,
    phone: String
  },
  
  shipTo: {
    branchWarehouse: String,
    name: String,
    address: String,
    gstin: String,
    drugLicense: String,
    phone: String
  },
  
  // Products
  products: [productLineSchema],
  
  // Pricing & Tax
  subTotal: { type: Number, default: 0 },
  productLevelDiscount: { type: Number, default: 0 },
  additionalDiscount: {
    type: { type: String, enum: ['percentage', 'amount'] },
    value: { type: Number, default: 0 }
  },
  taxType: {
    type: String,
    enum: ['IGST', 'CGST_SGST'],
    default: 'IGST'
  },
  gstRate: { type: Number, default: 5 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  shippingCharges: {
    type: { type: String, enum: ['percentage', 'amount'] },
    value: { type: Number, default: 0 }
  },
  grandTotal: { type: Number, default: 0 },
  
  // Communication
  toEmails: [String],
  fromEmail: String,
  ccEmails: [String],
  
  // Workflow
  currentStage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowStage'
  },
  workflowHistory: [workflowHistorySchema],
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'ordered', 
           'partial_received', 'received', 'qc_pending', 'qc_passed', 'qc_failed', 
           'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Template
  templateId: String,
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedDate: Date,
  
  // Receiving Status
  isFullyReceived: { type: Boolean, default: false },
  totalReceivedQty: { type: Number, default: 0 },
  totalBacklogQty: { type: Number, default: 0 }
  
}, { timestamps: true });

// Generate PO Number
purchaseOrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.poNumber) {
    const principal = await mongoose.model('Principal').findById(this.principal);
    const principalCode = principal.name.substring(0, 3).toUpperCase();
    const date = new Date();
    const dateStr = `${date.getDate().toString().padStart(2, '0')}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getFullYear().toString().substr(-2)}`;
    
    const count = await mongoose.model('PurchaseOrder').countDocuments({
      principal: this.principal,
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      }
    });
    
    this.poNumber = `MM-${principalCode}-${dateStr}/${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// Calculate totals
purchaseOrderSchema.methods.calculateTotals = function() {
  // Calculate subtotal
  this.subTotal = this.products.reduce((sum, item) => {
    const qty = item.quantity - (item.foc || 0);
    let itemTotal = qty * item.unitPrice;
    
    // Apply item discount
    if (item.discount) {
      if (item.discount.type === 'percentage') {
        itemTotal -= (itemTotal * item.discount.value / 100);
      } else {
        itemTotal -= item.discount.value;
      }
    }
    
    item.totalCost = itemTotal;
    return sum + itemTotal;
  }, 0);
  
  // Calculate product level discount
  this.productLevelDiscount = this.products.reduce((sum, item) => {
    if (item.discount) {
      if (item.discount.type === 'percentage') {
        return sum + ((item.quantity - (item.foc || 0)) * item.unitPrice * item.discount.value / 100);
      } else {
        return sum + item.discount.value;
      }
    }
    return sum;
  }, 0);
  
  // Apply additional discount
  let totalAfterDiscount = this.subTotal;
  if (this.additionalDiscount && this.additionalDiscount.value > 0) {
    if (this.additionalDiscount.type === 'percentage') {
      totalAfterDiscount -= (totalAfterDiscount * this.additionalDiscount.value / 100);
    } else {
      totalAfterDiscount -= this.additionalDiscount.value;
    }
  }
  
  // Calculate GST
  const gstAmount = totalAfterDiscount * (this.gstRate / 100);
  if (this.taxType === 'CGST_SGST') {
    this.cgst = gstAmount / 2;
    this.sgst = gstAmount / 2;
    this.igst = 0;
  } else {
    this.igst = gstAmount;
    this.cgst = 0;
    this.sgst = 0;
  }
  
  // Add shipping charges
  let shippingAmount = 0;
  if (this.shippingCharges && this.shippingCharges.value > 0) {
    if (this.shippingCharges.type === 'percentage') {
      shippingAmount = totalAfterDiscount * (this.shippingCharges.value / 100);
    } else {
      shippingAmount = this.shippingCharges.value;
    }
  }
  
  // Calculate grand total
  this.grandTotal = totalAfterDiscount + gstAmount + shippingAmount;
  
  return this.grandTotal;
};

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);