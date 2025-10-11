import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  resource: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'view', 
      'create', 
      'update', 
      'delete',
      'submit',
      'approve',
      'statistics',
      'adjust',
      'reserve',
      'transfer',
      'utilize',
      'movement_history'
    ],
  },
}, {
  timestamps: true,
});

export default mongoose.model('Permission', permissionSchema);