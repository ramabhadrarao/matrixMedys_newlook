// server/models/Principal.js
import mongoose from 'mongoose';

// Address schema for multiple addresses
const addressSchema = new mongoose.Schema({
  title: {
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
    minlength: 6,
    maxlength: 6,
  }
}, { _id: true });

// Document schema with validity support
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
  hasValidity: {
    type: Boolean,
    default: false,
  },
  startDate: {
    type: Date,
    required: function() { return this.hasValidity; }
  },
  endDate: {
    type: Date,
    required: function() { return this.hasValidity; },
    validate: {
      validator: function(endDate) {
        if (this.hasValidity && this.startDate) {
          return endDate > this.startDate;
        }
        return true;
      },
      message: 'End date must be after start date'
    }
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

// Contact person schema
const contactPersonSchema = new mongoose.Schema({
  portfolio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    default: null,
  },
  departmentName: {
    type: String,
    required: true,
    trim: true,
  },
  personName: {
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
  mobile: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  pincode: {
    type: String,
    required: true,
    trim: true,
    minlength: 6,
    maxlength: 6,
  }
}, { _id: true });

// Main Principal schema
const principalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  portfolio: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Portfolio',
    }],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one portfolio is required'
    },
    required: [true, 'Portfolio is required']
  },
  gstNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 15,
    maxlength: 15,
    validate: {
      validator: function(v) {
        // GST format: 2 digits (state code) + 10 chars (PAN) + 1 digit + 1 char + 1 digit
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: 'Invalid GST number format'
    }
  },
  panNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 10,
    maxlength: 10,
    validate: {
      validator: function(v) {
        // PAN format: ABCDE1234F
        return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
      },
      message: 'Invalid PAN number format (should be like ABCDE1234F)'
    }
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true,
  },
  mobile: {
    type: String,
    required: true,
    trim: true,
  },
  addresses: [addressSchema],
  documents: [documentSchema],
  contactPersons: [contactPersonSchema],
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
principalSchema.index({ name: 'text', email: 'text', gstNumber: 'text', panNumber: 'text' });
// principalSchema.index({ gstNumber: 1 });
// principalSchema.index({ panNumber: 1 });
principalSchema.index({ portfolio: 1 });

// Virtual to get document count
principalSchema.virtual('documentsCount').get(function() {
  return this.documents ? this.documents.length : 0;
});

// Virtual to get contact persons count
principalSchema.virtual('contactPersonsCount').get(function() {
  return this.contactPersons ? this.contactPersons.length : 0;
});

// Virtual to get expired documents
principalSchema.virtual('expiredDocuments').get(function() {
  if (!this.documents || !Array.isArray(this.documents)) {
    return [];
  }
  const now = new Date();
  return this.documents.filter(doc => 
    doc.hasValidity && doc.endDate && doc.endDate < now
  );
});

// Virtual to get documents expiring soon (within 30 days)
principalSchema.virtual('expiringDocuments').get(function() {
  if (!this.documents || !Array.isArray(this.documents)) {
    return [];
  }
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  return this.documents.filter(doc => 
    doc.hasValidity && 
    doc.endDate && 
    doc.endDate > now && 
    doc.endDate <= thirtyDaysLater
  );
});
// Ensure virtual fields are serialized
principalSchema.set('toJSON', { virtuals: true });
principalSchema.set('toObject', { virtuals: true });

// Methods
principalSchema.methods.addAddress = function(addressData) {
  this.addresses.push(addressData);
  return this.save();
};

principalSchema.methods.updateAddress = function(addressId, addressData) {
  const address = this.addresses.id(addressId);
  if (address) {
    Object.assign(address, addressData);
    return this.save();
  }
  throw new Error('Address not found');
};

principalSchema.methods.removeAddress = function(addressId) {
  this.addresses.id(addressId).remove();
  return this.save();
};

principalSchema.methods.addDocument = function(documentData) {
  this.documents.push(documentData);
  return this.save();
};

principalSchema.methods.updateDocument = function(documentId, documentData) {
  const document = this.documents.id(documentId);
  if (document) {
    Object.assign(document, documentData);
    return this.save();
  }
  throw new Error('Document not found');
};

principalSchema.methods.removeDocument = function(documentId) {
  this.documents.id(documentId).remove();
  return this.save();
};

principalSchema.methods.addContactPerson = function(contactData) {
  this.contactPersons.push(contactData);
  return this.save();
};

principalSchema.methods.updateContactPerson = function(contactId, contactData) {
  const contact = this.contactPersons.id(contactId);
  if (contact) {
    Object.assign(contact, contactData);
    return this.save();
  }
  throw new Error('Contact person not found');
};

principalSchema.methods.removeContactPerson = function(contactId) {
  this.contactPersons.id(contactId).remove();
  return this.save();
};

export default mongoose.model('Principal', principalSchema);