// server/models/Branch.js
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

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
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
  branchCode: {
    type: String,
    trim: true,
    uppercase: true,
  },
  drugLicenseNumber: {
    type: String,
    required: true,
    trim: true,
  },
  gstNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  panNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  gstAddress: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
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
branchSchema.index({ name: 'text', branchCode: 'text', gstNumber: 'text' });
branchSchema.index({ gstNumber: 1 });
branchSchema.index({ panNumber: 1 });
branchSchema.index({ isActive: 1 });

// Virtual for documents count
branchSchema.virtual('documentsCount').get(function() {
  return this.documents ? this.documents.length : 0;
});

// Virtual for document URLs
branchSchema.virtual('documentUrls').get(function() {
  if (!this.documents || this.documents.length === 0) return [];
  
  return this.documents.map(doc => ({
    ...doc.toObject(),
    url: `/api/files/branch-documents/${doc.filename}`,
    viewUrl: `/api/files/branch-documents/${doc.filename}?view=true`
  }));
});

// Set virtuals to be included in JSON
branchSchema.set('toJSON', { virtuals: true });
branchSchema.set('toObject', { virtuals: true });

// Methods for document management
branchSchema.methods.addDocument = function(documentData) {
  this.documents.push(documentData);
  return this.save();
};

branchSchema.methods.removeDocument = function(documentId) {
  this.documents.id(documentId).remove();
  return this.save();
};

branchSchema.methods.updateDocument = function(documentId, updateData) {
  const document = this.documents.id(documentId);
  if (document) {
    Object.assign(document, updateData);
    return this.save();
  }
  throw new Error('Document not found');
};

export default mongoose.model('Branch', branchSchema);