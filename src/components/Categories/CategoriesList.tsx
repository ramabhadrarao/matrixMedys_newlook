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
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { categoryAPI, Category } from '../../services/categoryAPI';
import { principalAPI } from '../../services/principalAPI';
import { portfolioAPI } from '../../services/doctorAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const CategoriesList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
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
  
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  
  const canCreate = hasPermission('categories', 'create');
  const canUpdate = hasPermission('categories', 'update');
  const canDelete = hasPermission('categories', 'delete');

  useEffect(() => {
    fetchPrincipals();
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPrincipal && selectedPortfolio) {
      fetchCategories();
    }
  }, [selectedPrincipal, selectedPortfolio, viewMode]);

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
      
      if (viewMode === 'tree' && selectedPrincipal && selectedPortfolio) {
        const response = await categoryAPI.getCategoryTree(selectedPrincipal, selectedPortfolio);
        setCategories(response.data.tree || []);
      } else if (selectedPrincipal && selectedPortfolio) {
        const response = await categoryAPI.getCategories({
          principal: selectedPrincipal,
          portfolio: selectedPortfolio,
          flat: true
        });
        setCategories(response.data.categories || []);
      }
    } catch (error) {
      handleApiError(error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
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

  const renderCategoryTree = (categories: Category[], level = 0) => {
    return categories.map((category, index) => {
      const isExpanded = expandedCategories.has(category._id);
      const hasChildren = category.hasChildren || (category.children && category.children.length > 0);
      
      return (
        <div key={category._id}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg ${
              level > 0 ? `ml-${level * 6}` : ''
            }`}
            style={{ marginLeft: level * 24 }}
          >
            <div className="flex items-center flex-1">
              <button
                onClick={() => toggleCategoryExpand(category._id)}
                className="p-1 mr-2"
                disabled={!hasChildren}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                  )
                ) : (
                  <div className="w-4 h-4" />
                )}
              </button>
              
              <div className="flex items-center flex-1">
                {hasChildren ? (
                  isExpanded ? (
                    <FolderOpen className="w-5 h-5 text-blue-600 mr-3" />
                  ) : (
                    <Folder className="w-5 h-5 text-blue-500 mr-3" />
                  )
                ) : (
                  <Package className="w-5 h-5 text-gray-400 mr-3" />
                )}
                
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900">{category.name}</span>
                    {category.productsCount > 0 && (
                      <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        {category.productsCount} products
                      </span>
                    )}
                    {category.childrenCount > 0 && (
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {category.childrenCount} subcategories
                      </span>
                    )}
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Link
                to={`/categories/${category._id}`}
                className="text-blue-600 hover:text-blue-900 p-1 rounded"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </Link>
              
              {canUpdate && (
                <Link
                  to={`/categories/${category._id}/edit`}
                  className="text-green-600 hover:text-green-900 p-1 rounded"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </Link>
              )}
              
              {canDelete && !hasChildren && category.productsCount === 0 && (
                <button
                  onClick={() => {
                    setCategoryToDelete(category);
                    setShowDeleteModal(true);
                  }}
                  className="text-red-600 hover:text-red-900 p-1 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
          
          {isExpanded && category.children && category.children.length > 0 && (
            <div className="mt-1">
              {renderCategoryTree(category.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
          <p className="text-gray-600 mt-1">
            Manage product categories and hierarchy
          </p>
        </div>
        
        {canCreate && selectedPrincipal && selectedPortfolio && (
  <Link
    to={`/categories/new?principal=${selectedPrincipal}&portfolio=${selectedPortfolio}`}
    className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
  >
    <Plus className="w-4 h-4 mr-2" />
    Add Category
  </Link>
)}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Principal *
            </label>
            <select
              value={selectedPrincipal}
              onChange={(e) => setSelectedPrincipal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Principal</option>
              {principals.map((principal) => (
                <option key={principal._id} value={principal._id}>
                  {principal.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Portfolio *
            </label>
            <select
              value={selectedPortfolio}
              onChange={(e) => setSelectedPortfolio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Portfolio</option>
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
      </div>

      {/* Categories List/Tree */}
      <div className="bg-white rounded-lg shadow-sm">
        {!selectedPrincipal || !selectedPortfolio ? (
          <div className="p-8 text-center">
            <FolderTree className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Select Principal and Portfolio to view categories</p>
          </div>
        ) : loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center">
            <FolderTree className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No categories found</p>
            <p className="text-gray-400 text-sm mt-2">
              Create your first category to get started
            </p>
          </div>
        ) : (
          <div className="p-6">
            {viewMode === 'tree' ? (
              renderCategoryTree(categories)
            ) : (
              <div className="space-y-2">
                {categories.map((category, index) => (
                  <motion.div
                    key={category._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center flex-1">
                      <Folder className="w-5 h-5 text-blue-500 mr-3" />
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{category.name}</span>
                          <span className="ml-2 text-sm text-gray-500">
                            Level {category.level}
                          </span>
                          {category.productsCount > 0 && (
                            <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                              {category.productsCount} products
                            </span>
                          )}
                        </div>
                        {category.path && (
                          <p className="text-sm text-gray-600 mt-1">{category.path}</p>
                        )}
                      </div>
                    </div>
                    
                    // In the renderCategoryTree function of CategoriesList.tsx
<div className="flex items-center space-x-2">
  <Link
    to={`/categories/${category._id}`}
    className="text-blue-600 hover:text-blue-900 p-1 rounded"
    title="View Details"
  >
    <Eye className="w-4 h-4" />
  </Link>
  
  {canCreate && (
    <Link
      to={`/categories/new?principal=${category.principal._id || selectedPrincipal}&portfolio=${category.portfolio._id || selectedPortfolio}&parent=${category._id}`}
      className="text-green-600 hover:text-green-900 p-1 rounded"
      title="Add Subcategory"
    >
      <Plus className="w-4 h-4" />
    </Link>
  )}
  
  {canUpdate && (
    <Link
      to={`/categories/${category._id}/edit`}
      className="text-yellow-600 hover:text-yellow-900 p-1 rounded"
      title="Edit"
    >
      <Edit className="w-4 h-4" />
    </Link>
  )}
  
  {canDelete && !hasChildren && category.productsCount === 0 && (
    <button
      onClick={() => {
        setCategoryToDelete(category);
        setShowDeleteModal(true);
      }}
      className="text-red-600 hover:text-red-900 p-1 rounded"
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