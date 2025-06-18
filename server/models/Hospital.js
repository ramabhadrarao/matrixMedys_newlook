// server/models/Hospital.js - Updated version
import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema({
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
  // Updated agreement file structure to store more file information
  agreementFile: {
    filename: {
      type: String,
      default: null,
    },
    originalName: {
      type: String,
      default: null,
    },
    mimetype: {
      type: String,
      default: null,
    },
    size: {
      type: Number,
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    }
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

// Index for search performance
hospitalSchema.index({ name: 'text', email: 'text', gstNumber: 'text' });

// Virtual to get file download URL
hospitalSchema.virtual('agreementFileUrl').get(function() {
  if (this.agreementFile && this.agreementFile.filename) {
    return `/api/files/download/${this.agreementFile.filename}`;
  }
  return null;
});

// Virtual to get file view URL
hospitalSchema.virtual('agreementFileViewUrl').get(function() {
  if (this.agreementFile && this.agreementFile.filename) {
    return `/api/files/view/${this.agreementFile.filename}`;
  }
  return null;
});

// Ensure virtual fields are serialized
hospitalSchema.set('toJSON', { virtuals: true });
hospitalSchema.set('toObject', { virtuals: true });

export default mongoose.model('Hospital', hospitalSchema);