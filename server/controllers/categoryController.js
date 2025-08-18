import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Principal from '../models/Principal.js';
import Portfolio from '../models/Portfolio.js';

// Get all categories (tree structure)
export const getCategories = async (req, res) => {
  try {
    const { 
      principal, 
      portfolio, 
      parent = undefined, // Don't default to 'root'
      flat = false 
    } = req.query;
    
    let query = {};
    
    if (principal) {
      query.principal = principal;
    }
    
    if (portfolio) {
      query.portfolio = portfolio;
    }
    
    // Handle parent filter
    if (parent === 'root') {
      query.parent = null;
    } else if (parent) {
      query.parent = parent;
    }
    
    const categories = await Category.find(query)
      .populate('principal', '_id name')
      .populate('portfolio', '_id name')
      .populate('parent', '_id name')
      .populate('ancestors', '_id name')
      .sort({ level: 1, sortOrder: 1, name: 1 })
      .lean(); // Use lean for better performance
    
    // Ensure all fields are properly set
    const processedCategories = categories.map(cat => ({
      ...cat,
      _id: cat._id.toString(),
      parent: cat.parent ? (typeof cat.parent === 'object' ? cat.parent._id.toString() : cat.parent) : null,
      level: cat.level || 0,
      path: cat.path || '',
      ancestors: cat.ancestors || [],
      hasChildren: cat.hasChildren || false,
      childrenCount: cat.childrenCount || 0,
      productsCount: cat.productsCount || 0,
      sortOrder: cat.sortOrder || 0,
      isActive: cat.isActive !== false
    }));
    
    if (flat) {
      res.json({ categories: processedCategories });
    } else {
      // Build tree structure
      const tree = await buildCategoryTree(processedCategories);
      res.json({ categories: tree });
    }
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};
// Helper function to build tree
const buildCategoryTree = async (categories) => {
  const categoryMap = {};
  const tree = [];
  
  // First pass: create map
  categories.forEach(cat => {
    categoryMap[cat._id] = {
      ...cat.toObject(),
      children: []
    };
  });
  
  // Second pass: build tree
  categories.forEach(cat => {
    if (cat.parent) {
      const parent = categoryMap[cat.parent._id || cat.parent];
      if (parent) {
        parent.children.push(categoryMap[cat._id]);
      }
    } else {
      tree.push(categoryMap[cat._id]);
    }
  });
  
  return tree;
};

// Get category tree for a principal and portfolio
export const getCategoryTree = async (req, res) => {
  try {
    const { principalId, portfolioId } = req.params;
    
    const categories = await Category.find({
      principal: principalId,
      portfolio: portfolioId
    })
    .populate('parent', 'name')
    .sort({ level: 1, sortOrder: 1, name: 1 });
    
    const tree = await buildCategoryTree(categories);
    
    res.json({ 
      tree,
      total: categories.length 
    });
  } catch (error) {
    console.error('Get category tree error:', error);
    res.status(500).json({ message: 'Failed to fetch category tree' });
  }
};

// Get single category with children
export const getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id)
      .populate('principal', 'name')
      .populate('portfolio', 'name')
      .populate('parent', 'name')
      .populate('ancestors', 'name');
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Get children
    const children = await Category.find({ parent: id })
      .sort({ sortOrder: 1, name: 1 });
    
    // Get breadcrumb
    const breadcrumb = await category.getFullPath();
    
    res.json({
      category,
      children,
      breadcrumb
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Failed to fetch category' });
  }
};

// Create category
// server/controllers/categoryController.js - Complete createCategory method
// server/controllers/categoryController.js - Updated createCategory method
export const createCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      principal,
      portfolio,
      parent,
      sortOrder
    } = req.body;
    
    // Validate principal and portfolio exist (using lean() for better performance)
    const principalExists = await Principal.findById(principal).lean();
    if (!principalExists) {
      return res.status(400).json({ message: 'Invalid principal' });
    }
    
    const portfolioExists = await Portfolio.findById(portfolio).lean();
    if (!portfolioExists) {
      return res.status(400).json({ message: 'Invalid portfolio' });
    }
    
    // If parent is provided and not null/empty, validate it exists
    let parentCategory = null;
    if (parent && parent !== 'null' && parent !== '') {
      parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({ message: 'Invalid parent category' });
      }
      
      // Check if parent belongs to same principal and portfolio
      if (parentCategory.principal.toString() !== principal ||
          parentCategory.portfolio.toString() !== portfolio) {
        return res.status(400).json({ 
          message: 'Parent category must belong to same principal and portfolio' 
        });
      }
    }
    
    // Check if category name already exists in the same principal/portfolio at the same level
    const existingCategory = await Category.findOne({
      name: name.trim(),
      principal,
      portfolio,
      parent: parentCategory ? parent : null
    });
    
    if (existingCategory) {
      return res.status(400).json({ 
        message: 'A category with this name already exists at this level' 
      });
    }
    
    // Create the category
    const category = new Category({
      name: name.trim(),
      description: description || '',
      principal,
      portfolio,
      parent: parentCategory ? parent : null,
      sortOrder: sortOrder || 0,
      createdBy: req.user._id,
      isActive: true,
      level: parentCategory ? parentCategory.level + 1 : 0,
      path: '',
      ancestors: [],
      hasChildren: false,
      childrenCount: 0,
      productsCount: 0
    });
    
    // Set path and ancestors if has parent
    if (parentCategory) {
      category.level = parentCategory.level + 1;
      category.path = parentCategory.path ? 
        `${parentCategory.path} > ${parentCategory.name}` : 
        parentCategory.name;
      category.ancestors = [...(parentCategory.ancestors || []), parentCategory._id];
      
      // Update parent's hasChildren and childrenCount
      await Category.findByIdAndUpdate(parent, {
        hasChildren: true,
        $inc: { childrenCount: 1 }
      });
    }
    
    // Save the category
    await category.save();
    
    // Populate only necessary fields for response (selective population)
    await category.populate([
      { path: 'principal', select: 'name' },
      { path: 'portfolio', select: 'name' },
      { path: 'parent', select: 'name' },
      { path: 'createdBy', select: 'name email' }
    ]);
    
    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `A category with this ${field} already exists` 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: messages 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to create category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Update category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      parent,
      sortOrder,
      isActive
    } = req.body;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // If changing parent, validate
    if (parent !== undefined && parent !== category.parent?.toString()) {
      // Check for circular reference
      if (parent === id) {
        return res.status(400).json({ message: 'Category cannot be its own parent' });
      }
      
      // Check if new parent is not a descendant
      const descendants = await category.getDescendants();
      if (descendants.some(d => d._id.toString() === parent)) {
        return res.status(400).json({ 
          message: 'Cannot move category under its own descendant' 
        });
      }
      
      // Validate parent exists and belongs to same principal/portfolio
      if (parent) {
        const parentCategory = await Category.findById(parent);
        if (!parentCategory) {
          return res.status(400).json({ message: 'Invalid parent category' });
        }
        
        if (parentCategory.principal.toString() !== category.principal.toString() ||
            parentCategory.portfolio.toString() !== category.portfolio.toString()) {
          return res.status(400).json({ 
            message: 'Parent category must belong to same principal and portfolio' 
          });
        }
      }
    }
    
    // Update fields
    category.name = name;
    category.description = description;
    category.parent = parent || null;
    category.sortOrder = sortOrder;
    category.isActive = isActive;
    category.updatedBy = req.user._id;
    
    await category.save();
    await category.populate('principal', 'name');
    await category.populate('portfolio', 'name');
    await category.populate('parent', 'name');
    
    res.json({
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if category can be deleted
    const canDelete = await category.canDelete();
    if (!canDelete) {
      return res.status(400).json({ 
        message: 'Cannot delete category. It has subcategories or products.' 
      });
    }
    
    // Update parent's children count
    if (category.parent) {
      await Category.findByIdAndUpdate(category.parent, {
        $inc: { childrenCount: -1 }
      });
      
      // Check if parent still has children
      const siblingCount = await Category.countDocuments({ 
        parent: category.parent,
        _id: { $ne: id }
      });
      
      if (siblingCount === 0) {
        await Category.findByIdAndUpdate(category.parent, {
          hasChildren: false
        });
      }
    }
    
    await Category.findByIdAndDelete(id);
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
};

// Move category to different parent
export const moveCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { newParentId } = req.body;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Validate new parent
    if (newParentId) {
      if (newParentId === id) {
        return res.status(400).json({ message: 'Category cannot be its own parent' });
      }
      
      const newParent = await Category.findById(newParentId);
      if (!newParent) {
        return res.status(400).json({ message: 'New parent category not found' });
      }
      
      // Check for circular reference
      const descendants = await category.getDescendants();
      if (descendants.some(d => d._id.toString() === newParentId)) {
        return res.status(400).json({ 
          message: 'Cannot move category under its own descendant' 
        });
      }
    }
    
    // Update old parent's count
    if (category.parent) {
      await Category.findByIdAndUpdate(category.parent, {
        $inc: { childrenCount: -1 }
      });
    }
    
    // Update category's parent
    category.parent = newParentId || null;
    await category.save();
    
    // Update all descendants' paths and ancestors
    const descendants = await category.getDescendants();
    for (const descendant of descendants) {
      await descendant.save(); // This will trigger the pre-save hook to update path
    }
    
    res.json({
      message: 'Category moved successfully',
      category
    });
  } catch (error) {
    console.error('Move category error:', error);
    res.status(500).json({ message: 'Failed to move category' });
  }
};

// Get category products
export const getCategoryProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, includeSubcategories = false } = req.query;
    
    let query = {};
    
    if (includeSubcategories === 'true') {
      // Get category and all its descendants
      const category = await Category.findById(id);
      const descendants = await category.getDescendants();
      const categoryIds = [id, ...descendants.map(d => d._id)];
      query.category = { $in: categoryIds };
    } else {
      query.category = id;
    }
    
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('principal', 'name')
      .populate('portfolio', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Product.countDocuments(query);
    
    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get category products error:', error);
    res.status(500).json({ message: 'Failed to fetch category products' });
  }
};