// server/models/Warehouse.js
import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
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
  documentName: {
    type: String,
    required: true,
    trim: true,
  },
  validityStartDate: {
    type: Date,
    required: true,
  },
  validityEndDate: {
    type: Date,
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

const warehouseSchema = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  warehouseCode: {
    type: String,
    trim: true,
    uppercase: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  alternatePhone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  drugLicenseNumber: {
    type: String,
    required: true,
    trim: true,
  },
  district: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'State',
    required: true,
  },
  pincode: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  remarks: {
    type: String,
    trim: true,
  },
  documents: [documentSchema],
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
warehouseSchema.index({ branch: 1, name: 1 });
warehouseSchema.index({ name: 'text', warehouseCode: 'text' });
warehouseSchema.index({ status: 1 });
warehouseSchema.index({ isActive: 1 });

// Virtual for documents count
warehouseSchema.virtual('documentsCount').get(function() {
  return this.documents ? this.documents.length : 0;
});

// Virtual for document URLs
warehouseSchema.virtual('documentUrls').get(function() {
  if (!this.documents || this.documents.length === 0) return [];
  
  return this.documents.map(doc => ({
    ...doc.toObject(),
    url: `/api/files/warehouse-documents/${doc.filename}`,
    viewUrl: `/api/files/warehouse-documents/${doc.filename}?view=true`
  }));
});

// Set virtuals to be included in JSON
warehouseSchema.set('toJSON', { virtuals: true });
warehouseSchema.set('toObject', { virtuals: true });

// Methods for document management
warehouseSchema.methods.addDocument = function(documentData) {
  this.documents.push(documentData);
  return this.save();
};

warehouseSchema.methods.removeDocument = function(documentId) {
  this.documents.id(documentId).remove();
  return this.save();
};

warehouseSchema.methods.updateDocument = function(documentId, updateData) {
  const document = this.documents.id(documentId);
  if (document) {
    Object.assign(document, updateData);
    return this.save();
  }
  throw new Error('Document not found');
};

export default mongoose.model('Warehouse', warehouseSchema);