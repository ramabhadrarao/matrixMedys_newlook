import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
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
  
  // Hierarchical Structure
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null, // null means root category
  },
  level: {
    type: Number,
    default: 0, // 0 for root, increments for each level
  },
  path: {
    type: String,
    default: '', // Store path like "root/parent/child"
  },
  ancestors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],
  
  // Denormalized fields for performance
  hasChildren: {
    type: Boolean,
    default: false,
  },
  childrenCount: {
    type: Number,
    default: 0,
  },
  productsCount: {
    type: Number,
    default: 0,
  },
  
  // Additional fields
  slug: {
    type: String,
    unique: true,
    sparse: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
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

// Indexes for performance
categorySchema.index({ principal: 1, portfolio: 1, parent: 1 });
categorySchema.index({ path: 1 });
categorySchema.index({ ancestors: 1 });
// categorySchema.index({ slug: 1 });

// Generate slug before saving
categorySchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('name')) {
    // Generate unique slug
    const baseSlug = this.name.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    
    let slug = baseSlug;
    let counter = 1;
    
    while (await mongoose.models.Category.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

// Update path and ancestors when parent changes
categorySchema.pre('save', async function(next) {
  if (this.isModified('parent')) {
    if (this.parent) {
      const parent = await mongoose.models.Category.findById(this.parent);
      if (parent) {
        this.level = parent.level + 1;
        this.path = parent.path ? `${parent.path}/${parent.name}` : parent.name;
        this.ancestors = [...parent.ancestors, parent._id];
      }
    } else {
      this.level = 0;
      this.path = '';
      this.ancestors = [];
    }
  }
  next();
});

// Update parent's hasChildren and childrenCount
categorySchema.post('save', async function() {
  if (this.parent) {
    await mongoose.models.Category.findByIdAndUpdate(this.parent, {
      hasChildren: true,
      $inc: { childrenCount: 1 }
    });
  }
});

// Method to get full path
categorySchema.methods.getFullPath = async function() {
  const pathArray = [this.name];
  let current = this;
  
  while (current.parent) {
    current = await mongoose.models.Category.findById(current.parent);
    if (current) {
      pathArray.unshift(current.name);
    } else {
      break;
    }
  }
  
  return pathArray.join(' > ');
};

// Method to get all descendants
categorySchema.methods.getDescendants = async function() {
  return await mongoose.models.Category.find({
    ancestors: this._id
  });
};

// Method to check if can be deleted
categorySchema.methods.canDelete = async function() {
  const hasChildren = await mongoose.models.Category.exists({ parent: this._id });
  const hasProducts = await mongoose.models.Product.exists({ category: this._id });
  
  return !hasChildren && !hasProducts;
};

export default mongoose.model('Category', categorySchema);