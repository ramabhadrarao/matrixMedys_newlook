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
  
  // Product Details
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
// productSchema.index({ code: 1 });
// productSchema.index({ sku: 1 });
// productSchema.index({ barcode: 1 });
productSchema.index({ name: 'text', specification: 'text' });

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

export default mongoose.model('Product', productSchema);