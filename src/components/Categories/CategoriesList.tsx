import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Folder,
  FolderOpen,
  Package,
  Filter,
  X,
  RefreshCw,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { categoryAPI, Category } from '../../services/categoryAPI';
import { principalAPI } from '../../services/principalAPI';
import { portfolioAPI } from '../../services/doctorAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

const CategoriesList: React.FC = () => {
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrincipal, setSelectedPrincipal] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState('');
  const [principals, setPrincipals] = useState<any[]>([]);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  
  const canCreate = hasPermission('categories', 'create');
  const canUpdate = hasPermission('categories', 'update');
  const canDelete = hasPermission('categories', 'delete');

  useEffect(() => {
    fetchPrincipals();
    fetchPortfolios();
    fetchAllCategories();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedPrincipal, selectedPortfolio, searchTerm, allCategories]);

  const fetchPrincipals = async () => {
    try {
      const response = await principalAPI.getPrincipals({ limit: 100 });
      setPrincipals(response.data.principals || []);
    } catch (error) {
      handleApiError(error);
    }
  };

  const fetchPortfolios = async () => {
    try {
      const response = await portfolioAPI.getPortfolios({ limit: 100 });
      setPortfolios(response.data.portfolios || []);
    } catch (error) {
      handleApiError(error);
    }
  };

  const fetchAllCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryAPI.getCategories({ flat: true });
      const flatCategories = response.data.categories || [];
      setAllCategories(flatCategories);
      
      // Build initial tree and auto-expand first two levels
      const tree = buildCategoryTree(flatCategories);
      setCategories(tree);
      
      // Auto-expand level 0 and level 1 categories
      const expandIds = new Set<string>();
      const collectExpandIds = (cats: CategoryWithChildren[], maxLevel: number, currentLevel = 0) => {
        if (currentLevel >= maxLevel) return;
        cats.forEach(cat => {
          expandIds.add(cat._id);
          if (cat.children && cat.children.length > 0) {
            collectExpandIds(cat.children, maxLevel, currentLevel + 1);
          }
        });
      };
      collectExpandIds(tree, 2); // Expand first 2 levels
      setExpandedCategories(expandIds);
    } catch (error) {
      handleApiError(error);
      setAllCategories([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filteredCategories = [...allCategories];
    
    // Filter by principal
    if (selectedPrincipal) {
      filteredCategories = filteredCategories.filter(cat => {
        const principalId = typeof cat.principal === 'object' ? cat.principal._id : cat.principal;
        return principalId === selectedPrincipal;
      });
    }
    
    // Filter by portfolio
    if (selectedPortfolio) {
      filteredCategories = filteredCategories.filter(cat => {
        const portfolioId = typeof cat.portfolio === 'object' ? cat.portfolio._id : cat.portfolio;
        return portfolioId === selectedPortfolio;
      });
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchingIds = new Set<string>();
      
      // Find all matching categories and their ancestors
      filteredCategories.forEach(cat => {
        if (cat.name.toLowerCase().includes(searchLower) ||
            (cat.description && cat.description.toLowerCase().includes(searchLower))) {
          matchingIds.add(cat._id);
          // Add all ancestors to ensure the path is visible
          if (cat.ancestors) {
            cat.ancestors.forEach((ancestor: any) => {
              const ancestorId = typeof ancestor === 'string' ? ancestor : ancestor._id;
              matchingIds.add(ancestorId);
            });
          }
        }
      });
      
      // Filter to only include matching categories and their ancestors
      filteredCategories = allCategories.filter(cat => matchingIds.has(cat._id));
    }
    
    // Always build tree structure
    const tree = buildCategoryTree(filteredCategories);
    setCategories(tree);
  };

  const buildCategoryTree = (flatCategories: Category[]): CategoryWithChildren[] => {
    const categoryMap: { [key: string]: CategoryWithChildren } = {};
    const tree: CategoryWithChildren[] = [];
    
    // First pass: create map with all categories
    flatCategories.forEach(cat => {
      categoryMap[cat._id] = {
        ...cat,
        children: []
      };
    });
    
    // Second pass: build tree structure
    flatCategories.forEach(cat => {
      const categoryNode = categoryMap[cat._id];
      
      if (cat.parent) {
        const parentId = typeof cat.parent === 'string' ? cat.parent : cat.parent._id;
        const parentNode = categoryMap[parentId];
        
        if (parentNode) {
          if (!parentNode.children) {
            parentNode.children = [];
          }
          parentNode.children.push(categoryNode);
          parentNode.hasChildren = true;
          parentNode.childrenCount = parentNode.children.length;
        } else {
          // Parent not in filtered list, add as root
          tree.push(categoryNode);
        }
      } else {
        // No parent, add to root
        tree.push(categoryNode);
      }
    });
    
    // Sort children at each level
    const sortCategories = (cats: CategoryWithChildren[]) => {
      cats.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        }
        return a.name.localeCompare(b.name);
      });
      
      cats.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          sortCategories(cat.children);
        }
      });
    };
    
    sortCategories(tree);
    
    return tree;
  };

  const toggleCategoryExpand = (categoryId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (cats: CategoryWithChildren[]) => {
      cats.forEach(cat => {
        allIds.add(cat._id);
        if (cat.children) {
          collectIds(cat.children);
        }
      });
    };
    collectIds(categories);
    setExpandedCategories(allIds);
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const clearFilters = () => {
    setSelectedPrincipal('');
    setSelectedPortfolio('');
    setSearchTerm('');
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    
    try {
      setDeleteLoading(true);
      await categoryAPI.deleteCategory(categoryToDelete._id);
      toast.success('Category deleted successfully');
      setShowDeleteModal(false);
      setCategoryToDelete(null);
      fetchAllCategories();
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getLevelColor = (level: number) => {
    const colors = [
      'bg-purple-50 border-purple-200', // Level 0
      'bg-blue-50 border-blue-200',     // Level 1
      'bg-green-50 border-green-200',   // Level 2
      'bg-yellow-50 border-yellow-200', // Level 3
      'bg-pink-50 border-pink-200',     // Level 4+
    ];
    return colors[Math.min(level, colors.length - 1)];
  };

  const getLevelBadgeColor = (level: number) => {
    const colors = [
      'bg-purple-100 text-purple-700', // Level 0
      'bg-blue-100 text-blue-700',     // Level 1
      'bg-green-100 text-green-700',   // Level 2
      'bg-yellow-100 text-yellow-700', // Level 3
      'bg-pink-100 text-pink-700',     // Level 4+
    ];
    return colors[Math.min(level, colors.length - 1)];
  };

  const renderCategoryTree = (categories: CategoryWithChildren[], level = 0): JSX.Element[] => {
    return categories.map((category) => {
      const isExpanded = expandedCategories.has(category._id);
      const hasChildren = category.children && category.children.length > 0;
      const indentSize = level * 32; // 32px per level for clear hierarchy
      
      return (
        <div key={category._id} className="category-node">
          {/* Category Row */}
          <div 
            className={`group relative border-l-4 ${getLevelColor(level)} hover:shadow-md transition-all duration-200 mb-1 rounded-r-lg`}
          >
            <div 
              className="flex items-center justify-between py-3 pr-4"
              style={{ paddingLeft: `${indentSize + 16}px` }}
            >
              {/* Left Section: Expand/Icon/Info */}
              <div className="flex items-center flex-1 min-w-0">
                {/* Expand/Collapse Button */}
                <button
                  onClick={(e) => toggleCategoryExpand(category._id, e)}
                  className={`p-1 mr-3 hover:bg-gray-200 rounded-lg transition-colors ${
                    !hasChildren ? 'invisible' : ''
                  }`}
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {hasChildren && (
                    isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )
                  )}
                </button>
                
                {/* Category Icon */}
                <div className="mr-3 flex-shrink-0">
                  {hasChildren ? (
                    isExpanded ? (
                      <FolderOpen className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Folder className="w-6 h-6 text-blue-500" />
                    )
                  ) : (
                    <Package className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                
                {/* Category Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-base">
                      {category.name}
                    </span>
                    
                    {/* Level Badge */}
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getLevelBadgeColor(level)}`}>
                      Level {level}
                    </span>
                    
                    {/* Products Count */}
                    {category.productsCount > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full font-medium">
                        {category.productsCount} {category.productsCount === 1 ? 'product' : 'products'}
                      </span>
                    )}
                    
                    {/* Children Count */}
                    {hasChildren && (
                      <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-medium">
                        {category.children?.length} {category.children?.length === 1 ? 'subcategory' : 'subcategories'}
                      </span>
                    )}
                    
                    {/* Status */}
                    {!category.isActive && (
                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full font-medium">
                        Inactive
                      </span>
                    )}
                  </div>
                  
                  {/* Description */}
                  {category.description && (
                    <p className="text-sm text-gray-600 line-clamp-1 mb-1">
                      {category.description}
                    </p>
                  )}
                  
                  {/* Principal and Portfolio */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center">
                      <Layers className="w-3 h-3 mr-1" />
                      {typeof category.principal === 'object' ? category.principal.name : 'Principal'}
                    </span>
                    <span>•</span>
                    <span>
                      {typeof category.portfolio === 'object' ? category.portfolio.name : 'Portfolio'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Right Section: Action Buttons */}
              <div className="flex items-center space-x-2 ml-4">
                {/* Create Subcategory Button */}
                {canCreate && (
                  <Link
                    to={`/categories/new?parent=${category._id}`}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                    title="Create Subcategory"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Sub
                  </Link>
                )}
                
                {/* View Button */}
                <Link
                  to={`/categories/${category._id}`}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                  title="View Details"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Link>
                
                {/* Edit Button */}
                {canUpdate && (
                  <Link
                    to={`/categories/${category._id}/edit`}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                    title="Edit Category"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Link>
                )}
                
                {/* Delete Button */}
                {canDelete && !hasChildren && category.productsCount === 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryToDelete(category);
                      setShowDeleteModal(true);
                    }}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Render Children */}
          {isExpanded && hasChildren && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-4 border-l-2 border-gray-200"
              >
                {renderCategoryTree(category.children!, level + 1)}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      );
    });
  };

  const hasActiveFilters = selectedPrincipal || selectedPortfolio || searchTerm;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
          <p className="text-gray-600 mt-1">
            Hierarchical category structure for products
            {allCategories.length > 0 && ` • ${allCategories.length} total categories`}
            {hasActiveFilters && ` • ${categories.length} showing`}
          </p>
        </div>
        
        {canCreate && (
          <Link
            to="/categories/new"
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Root Category
          </Link>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {/* Search and Controls */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 flex items-center ${
                showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-white text-blue-600 rounded-full">
                  Active
                </span>
              )}
            </button>
            
            <button
              onClick={expandAll}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              title="Expand All"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            
            <button
              onClick={collapseAll}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              title="Collapse All"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={fetchAllCategories}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border-t pt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Principal
                  </label>
                  <select
                    value={selectedPrincipal}
                    onChange={(e) => setSelectedPrincipal(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Principals</option>
                    {principals.map((principal) => (
                      <option key={principal._id} value={principal._id}>
                        {principal.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Portfolio
                  </label>
                  <select
                    value={selectedPortfolio}
                    onChange={(e) => setSelectedPortfolio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Portfolios</option>
                    {portfolios.map((portfolio) => (
                      <option key={portfolio._id} value={portfolio._id}>
                        {portfolio.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200 flex items-center"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear All Filters
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Categories Tree */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-4">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FolderTree className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">
              {hasActiveFilters ? 'No categories found matching your filters' : 'No categories created yet'}
            </p>
            <p className="text-gray-400 text-sm mt-2 max-w-md text-center">
              {hasActiveFilters 
                ? 'Try adjusting your filters or search term to see more results.'
                : 'Get started by creating your first category to organize your products.'}
            </p>
            {canCreate && !hasActiveFilters && (
              <Link
                to="/categories/new"
                className="mt-6 inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Category
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {/* Category Tree Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <FolderTree className="w-5 h-5 mr-2 text-gray-600" />
                Category Hierarchy
              </h3>
              <span className="text-sm text-gray-500">
                {categories.length} root {categories.length === 1 ? 'category' : 'categories'}
              </span>
            </div>
            
            {/* Render Tree */}
            {renderCategoryTree(categories)}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the category <strong>"{categoryToDelete.name}"</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setCategoryToDelete(null);
                }}
                disabled={deleteLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center"
              >
                {deleteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Category'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CategoriesList;