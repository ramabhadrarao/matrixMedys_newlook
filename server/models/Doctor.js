// server/models/Doctor.js
import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
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
  fileType: {
    type: String,
    enum: ['license', 'certificate', 'degree', 'cv', 'other'],
    default: 'other',
  },
  description: {
    type: String,
    trim: true,
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

const targetSchema = new mongoose.Schema({
  month: {
    type: String,
    enum: ['january', 'february', 'march', 'april', 'may', 'june', 
           'july', 'august', 'september', 'october', 'november', 'december'],
    required: true,
  },
  target: {
    type: Number,
    required: true,
    min: 0,
  },
  year: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear(),
  }
}, { _id: false });

const doctorSchema = new mongoose.Schema({
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
    unique: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  specialization: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Portfolio',
    }],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one specialization is required'
    },
    required: [true, 'Specialization is required']
  },
  hospitals: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
    }],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one hospital is required'
    },
    required: [true, 'Hospitals are required']
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  targets: [targetSchema],
  attachments: [fileSchema],
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
doctorSchema.index({ name: 'text', email: 'text', location: 'text' });
doctorSchema.index({ email: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ hospitals: 1 });

// Virtual to get total attachments count
doctorSchema.virtual('attachmentsCount').get(function() {
  return this.attachments ? this.attachments.length : 0;
});

// Virtual to get current year targets
doctorSchema.virtual('currentYearTargets').get(function() {
  const currentYear = new Date().getFullYear();
  return this.targets.filter(target => target.year === currentYear);
});

// Virtual to get total annual target for current year
doctorSchema.virtual('annualTarget').get(function() {
  const currentYearTargets = this.currentYearTargets;
  return currentYearTargets.reduce((sum, target) => sum + target.target, 0);
});

// Ensure virtual fields are serialized
doctorSchema.set('toJSON', { virtuals: true });
doctorSchema.set('toObject', { virtuals: true });

// Method to add an attachment
doctorSchema.methods.addAttachment = function(fileData) {
  this.attachments.push(fileData);
  return this.save();
};

// Method to remove an attachment
doctorSchema.methods.removeAttachment = function(attachmentId) {
  this.attachments.id(attachmentId).remove();
  return this.save();
};

// Method to update targets for a specific year
doctorSchema.methods.updateTargets = function(targets, year = new Date().getFullYear()) {
  // Remove existing targets for the year
  this.targets = this.targets.filter(target => target.year !== year);
  
  // Add new targets
  const newTargets = targets.map(target => ({
    ...target,
    year
  }));
  
  this.targets.push(...newTargets);
  return this.save();
};

export default mongoose.model('Doctor', doctorSchema);