// src/components/Categories/CategoriesList.tsx - Fixed tree view with proper nesting
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Folder,
  FolderOpen,
  Package,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Filter,
  X,
  RefreshCw,
  MoreVertical
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
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [showFilters, setShowFilters] = useState(false);
  
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  
  const canCreate = hasPermission('categories', 'create');
  const canUpdate = hasPermission('categories', 'update');
  const canDelete = hasPermission('categories', 'delete');

  useEffect(() => {
    fetchPrincipals();
    fetchPortfolios();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [selectedPrincipal, selectedPortfolio, viewMode, searchTerm]);

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

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      let response;
      if (viewMode === 'tree') {
        if (selectedPrincipal && selectedPortfolio) {
          // Get tree for specific principal and portfolio
          response = await categoryAPI.getCategoryTree(selectedPrincipal, selectedPortfolio);
          setCategories(response.data.tree || []);
        } else {
          // Get all categories and build tree
          response = await categoryAPI.getCategories({ flat: false });
          const allCategories = response.data.categories || [];
          
          // Build tree from flat list
          const tree = buildCategoryTree(allCategories);
          setCategories(tree);
        }
      } else {
        // Flat view
        const params: any = { flat: true };
        if (selectedPrincipal) params.principal = selectedPrincipal;
        if (selectedPortfolio) params.portfolio = selectedPortfolio;
        
        response = await categoryAPI.getCategories(params);
        let flatCategories = response.data.categories || [];
        
        // Apply search filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          flatCategories = flatCategories.filter((cat: Category) => 
            cat.name.toLowerCase().includes(searchLower) ||
            (cat.description && cat.description.toLowerCase().includes(searchLower))
          );
        }
        
        setCategories(flatCategories);
      }
    } catch (error) {
      handleApiError(error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
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
          // Update parent's hasChildren flag
          parentNode.hasChildren = true;
          parentNode.childrenCount = (parentNode.childrenCount || 0) + 1;
        } else {
          // Parent not found, add as root
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

  const toggleCategoryExpand = (categoryId: string) => {
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
        if (cat.hasChildren || (cat.children && cat.children.length > 0)) {
          allIds.add(cat._id);
        }
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
    setShowFilters(false);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    
    try {
      setDeleteLoading(true);
      await categoryAPI.deleteCategory(categoryToDelete._id);
      toast.success('Category deleted successfully');
      setShowDeleteModal(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderCategoryTree = (categories: CategoryWithChildren[], level = 0): JSX.Element[] => {
    return categories.map((category) => {
      const isExpanded = expandedCategories.has(category._id);
      const hasChildren = category.children && category.children.length > 0;
      
      return (
        <div key={category._id}>
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="group"
            >
              <div 
                className={`flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors`}
                style={{ paddingLeft: `${level * 24 + 12}px` }}
              >
                <div className="flex items-center flex-1 min-w-0">
                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => toggleCategoryExpand(category._id)}
                    className={`p-1 mr-2 hover:bg-gray-200 rounded transition-colors ${!hasChildren ? 'invisible' : ''}`}
                  >
                    {hasChildren && (
                      isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                      )
                    )}
                  </button>
                  
                  {/* Category Icon */}
                  <div className="mr-3 flex-shrink-0">
                    {hasChildren ? (
                      isExpanded ? (
                        <FolderOpen className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Folder className="w-5 h-5 text-blue-500" />
                      )
                    ) : (
                      <Package className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  
                  {/* Category Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-medium text-gray-900">{category.name}</span>
                      <span className="text-xs text-gray-400">L{category.level || 0}</span>
                      
                      {category.productsCount > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                          {category.productsCount} products
                        </span>
                      )}
                      
                      {hasChildren && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                          {category.children?.length} subcategories
                        </span>
                      )}
                    </div>
                    
                    {category.description && (
                      <p className="text-sm text-gray-600 mt-1 truncate">{category.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">
                        {typeof category.principal === 'object' ? category.principal.name : 'Principal'} • 
                        {typeof category.portfolio === 'object' ? category.portfolio.name : 'Portfolio'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Add Subcategory */}
                  {canCreate && (
                    <Link
                      to={`/categories/new?parent=${category._id}`}
                      className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Add Subcategory"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Plus className="w-4 h-4" />
                    </Link>
                  )}
                  
                  {/* View */}
                  <Link
                    to={`/categories/${category._id}`}
                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Details"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  
                  {/* Edit */}
                  {canUpdate && (
                    <Link
                      to={`/categories/${category._id}/edit`}
                      className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  )}
                  
                  {/* Delete */}
                  {canDelete && !hasChildren && category.productsCount === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryToDelete(category);
                        setShowDeleteModal(true);
                      }}
                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Render Children */}
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {renderCategoryTree(category.children!, level + 1)}
            </motion.div>
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
            Manage product categories and hierarchy
            {categories.length > 0 && ` • ${categories.length} categories`}
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
        
        {canCreate && (
          <Link
            to={`/categories/new${selectedPrincipal && selectedPortfolio ? `?principal=${selectedPrincipal}&portfolio=${selectedPortfolio}` : ''}`}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Root Category
          </Link>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
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
            
            {viewMode === 'tree' && (
              <>
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
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </>
            )}
            
            <button
              onClick={fetchCategories}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border-t pt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Principal
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
                    Portfolio
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    View Mode
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('tree')}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                        viewMode === 'tree'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Tree View
                    </button>
                    <button
                      onClick={() => setViewMode('flat')}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                        viewMode === 'flat'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Flat View
                    </button>
                  </div>
                </div>
              </div>
              
              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200 flex items-center"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Categories List/Tree */}
      <div className="bg-white rounded-lg shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center">
            <FolderTree className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {hasActiveFilters ? 'No categories found matching filters' : 'No categories found'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {hasActiveFilters 
                ? 'Try adjusting your filters or search term'
                : 'Create your first category to get started'}
            </p>
            {canCreate && !hasActiveFilters && (
              <Link
                to="/categories/new"
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Category
              </Link>
            )}
          </div>
        ) : (
          <div className="p-4">
            {viewMode === 'tree' ? (
              <div className="space-y-1">
                {renderCategoryTree(categories)}
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((category, index) => (
                  <motion.div
                    key={category._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 group"
                  >
                    <div className="flex items-center flex-1">
                      <Folder className="w-5 h-5 text-blue-500 mr-3" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{category.name}</span>
                          <span className="text-xs text-gray-400">Level {category.level || 0}</span>
                          {category.productsCount > 0 && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                              {category.productsCount} products
                            </span>
                          )}
                        </div>
                        {category.path && (
                          <p className="text-sm text-gray-600 mt-1">{category.path}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {typeof category.principal === 'object' ? category.principal.name : 'Principal'} • 
                            {typeof category.portfolio === 'object' ? category.portfolio.name : 'Portfolio'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canCreate && (
                        <Link
                          to={`/categories/new?parent=${category._id}`}
                          className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Add Subcategory"
                        >
                          <Plus className="w-4 h-4" />
                        </Link>
                      )}
                      
                      <Link
                        to={`/categories/${category._id}`}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      
                      {canUpdate && (
                        <Link
                          to={`/categories/${category._id}/edit`}
                          className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      )}
                      
                      {canDelete && !category.hasChildren && category.productsCount === 0 && (
                        <button
                          onClick={() => {
                            setCategoryToDelete(category);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Category</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>"{categoryToDelete.name}"</strong>? This action cannot be undone.
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
                  'Delete'
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