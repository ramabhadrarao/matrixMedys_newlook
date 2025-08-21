// server/models/Product.js
import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  
  // Denormalized for querying (copied from category)
  principal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Principal',
    required: true,
  },
  portfolio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: true,
  },
  categoryPath: {
    type: String, // Full category path for display
  },
  categoryAncestors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],
  
  // ===== NEW FIELDS ADDED =====
  
  // Product Photo
  photo: {
    filename: { type: String, default: null },
    originalName: { type: String, default: null },
    mimetype: { type: String, default: null },
    size: { type: Number, default: null },
    uploadedAt: { type: Date, default: null },
    uploadedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      default: null 
    }
  },
  
  // Batch and Expiry Information
  batchNo: {
    type: String,
    trim: true,
    default: null
  },
  mfgDate: {
    type: Date,
    default: null
  },
  expDate: {
    type: Date,
    default: null,
    validate: {
      validator: function(expDate) {
        // Only validate if both dates exist
        if (this.mfgDate && expDate) {
          return expDate > this.mfgDate;
        }
        return true;
      },
      message: 'Expiry date must be after manufacturing date'
    }
  },
  
  // Pricing Information
  mrp: {
    type: Number,
    min: 0,
    default: 0,
    required: [true, 'MRP is required']
  },
  dealerPrice: {
    type: Number,
    min: 0,
    default: 0,
    required: [true, 'Dealer price is required'],
    validate: {
      validator: function(dealerPrice) {
        // Dealer price should not exceed MRP
        if (this.mrp && dealerPrice) {
          return dealerPrice <= this.mrp;
        }
        return true;
      },
      message: 'Dealer price cannot exceed MRP'
    }
  },
  defaultDiscount: {
    type: {
      type: String,
      enum: ['percentage', 'amount'],
      default: 'percentage'
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: function(value) {
          // If discount type is percentage, it should not exceed 100
          if (this.defaultDiscount && this.defaultDiscount.type === 'percentage') {
            return value <= 100;
          }
          return true;
        },
        message: 'Percentage discount cannot exceed 100%'
      }
    }
  },
  
  // ===== END NEW FIELDS =====
  
  // Product Details (Existing)
  gstPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  specification: {
    type: String,
    trim: true,
  },
  remarks: {
    type: String,
    trim: true,
  },
  
  // Documents
  documents: [documentSchema],
  
  // Unit of Measurement (for future inventory)
  unit: {
    type: String,
    enum: ['PCS', 'BOX', 'KG', 'GM', 'LTR', 'ML', 'MTR', 'CM', 'DOZEN', 'PACK'],
    default: 'PCS',
  },
  
  // SKU and Barcode (for inventory tracking)
  sku: {
    type: String,
    unique: true,
    sparse: true,
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
  },
  
  // HSN Code for GST
  hsnCode: {
    type: String,
    trim: true,
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Metadata
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

// Indexes
productSchema.index({ category: 1 });
productSchema.index({ principal: 1, portfolio: 1 });
productSchema.index({ name: 'text', specification: 'text' });
productSchema.index({ mrp: 1, dealerPrice: 1 }); // New index for pricing queries

// Auto-generate SKU if not provided
productSchema.pre('save', async function(next) {
  if (this.isNew && !this.sku) {
    // Generate SKU: PRD-XXXXX
    const count = await mongoose.models.Product.countDocuments();
    this.sku = `PRD-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Update category's product count
productSchema.post('save', async function() {
  if (this.category) {
    const count = await mongoose.models.Product.countDocuments({ 
      category: this.category 
    });
    await mongoose.models.Category.findByIdAndUpdate(this.category, {
      productsCount: count
    });
  }
});

// Update product count on delete
productSchema.post('remove', async function() {
  if (this.category) {
    const count = await mongoose.models.Product.countDocuments({ 
      category: this.category 
    });
    await mongoose.models.Category.findByIdAndUpdate(this.category, {
      productsCount: count
    });
  }
});

// Virtual for documents count
productSchema.virtual('documentsCount').get(function() {
  return this.documents ? this.documents.length : 0;
});

// Virtual for calculating effective price (dealer price - default discount)
productSchema.virtual('effectivePrice').get(function() {
  if (!this.dealerPrice) return 0;
  
  let price = this.dealerPrice;
  if (this.defaultDiscount && this.defaultDiscount.value > 0) {
    if (this.defaultDiscount.type === 'percentage') {
      price = price - (price * this.defaultDiscount.value / 100);
    } else {
      price = price - this.defaultDiscount.value;
    }
  }
  return price;
});

// Virtual to check if product is expired
productSchema.virtual('isExpired').get(function() {
  if (this.expDate) {
    return new Date() > this.expDate;
  }
  return false;
});

// Virtual to get days until expiry
productSchema.virtual('daysUntilExpiry').get(function() {
  if (this.expDate) {
    const today = new Date();
    const expiry = new Date(this.expDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return null;
});

// Method to add document
productSchema.methods.addDocument = function(documentData) {
  this.documents.push(documentData);
  return this.save();
};

// Method to remove document
productSchema.methods.removeDocument = function(documentId) {
  this.documents.id(documentId).remove();
  return this.save();
};

// Method to update photo
productSchema.methods.updatePhoto = function(photoData) {
  this.photo = photoData;
  return this.save();
};

// Method to calculate price with custom discount
productSchema.methods.calculatePrice = function(quantity, customDiscount) {
  let basePrice = this.dealerPrice * quantity;
  
  // Apply custom discount if provided, otherwise use default
  const discount = customDiscount || this.defaultDiscount;
  
  if (discount && discount.value > 0) {
    if (discount.type === 'percentage') {
      basePrice = basePrice - (basePrice * discount.value / 100);
    } else {
      basePrice = basePrice - discount.value;
    }
  }
  
  return basePrice;
};

// Method to check stock validity
productSchema.methods.checkStockValidity = function() {
  const result = {
    isValid: true,
    warnings: [],
    errors: []
  };
  
  // Check if expired
  if (this.isExpired) {
    result.errors.push('Product has expired');
    result.isValid = false;
  }
  
  // Check if expiring soon (within 30 days)
  if (this.daysUntilExpiry !== null && this.daysUntilExpiry <= 30 && this.daysUntilExpiry > 0) {
    result.warnings.push(`Product expiring in ${this.daysUntilExpiry} days`);
  }
  
  // Check if batch number is missing when dates are present
  if ((this.mfgDate || this.expDate) && !this.batchNo) {
    result.warnings.push('Batch number is missing for product with manufacturing/expiry date');
  }
  
  return result;
};

// Ensure virtual fields are serialized
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

export default mongoose.model('Product', productSchema);