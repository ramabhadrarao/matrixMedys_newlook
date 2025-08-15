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
      parent = 'root', // 'root' for top-level, or parent ID
      flat = false // If true, return flat list instead of tree
    } = req.query;
    
    let query = {};
    
    if (principal) {
      query.principal = principal;
    }
    
    if (portfolio) {
      query.portfolio = portfolio;
    }
    
    if (parent === 'root') {
      query.parent = null;
    } else if (parent) {
      query.parent = parent;
    }
    
    const categories = await Category.find(query)
      .populate('principal', 'name')
      .populate('portfolio', 'name')
      .populate('parent', 'name')
      .sort({ sortOrder: 1, name: 1 });
    
    if (flat) {
      res.json({ categories });
    } else {
      // Build tree structure
      const tree = await buildCategoryTree(categories);
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
    
    // Validate principal and portfolio exist
    const principalExists = await Principal.findById(principal);
    if (!principalExists) {
      return res.status(400).json({ message: 'Invalid principal' });
    }
    
    const portfolioExists = await Portfolio.findById(portfolio);
    if (!portfolioExists) {
      return res.status(400).json({ message: 'Invalid portfolio' });
    }
    
    // If parent is provided, validate it exists
    let parentCategory = null;
    if (parent) {
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
    
    const category = new Category({
      name,
      description,
      principal,
      portfolio,
      parent: parent || null,
      sortOrder: sortOrder || 0,
      createdBy: req.user._id
    });
    
    await category.save();
    await category.populate('principal', 'name');
    await category.populate('portfolio', 'name');
    await category.populate('parent', 'name');
    
    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Failed to create category' });
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