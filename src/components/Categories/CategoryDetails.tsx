import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Plus, 
  Trash2, 
  FolderTree,
  Folder,
  Package,
  ChevronRight,
  Eye,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { categoryAPI, Category } from '../../services/categoryAPI';
import { productAPI, Product } from '../../services/productAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const CategoryDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [children, setChildren] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const canCreate = hasPermission('categories', 'create');
  const canUpdate = hasPermission('categories', 'update');
  const canDelete = hasPermission('categories', 'delete');
  const canViewProducts = hasPermission('products', 'view');

  useEffect(() => {
    if (id) {
      fetchCategoryDetails();
    }
  }, [id]);

  useEffect(() => {
    if (id && canViewProducts) {
      fetchProducts();
    }
  }, [id, currentPage, canViewProducts]);

  const fetchCategoryDetails = async () => {
    try {
      setLoading(true);
      const response = await categoryAPI.getCategory(id!);
      setCategory(response.data.category);
      setChildren(response.data.children || []);
      setBreadcrumb(response.data.breadcrumb || '');
    } catch (error) {
      handleApiError(error);
      navigate('/categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const response = await categoryAPI.getCategoryProducts(id!, {
        page: currentPage,
        limit: 10,
        includeSubcategories: false
      });
      setProducts(response.data.products || []);
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!category) return;
    
    try {
      setDeleteLoading(true);
      await categoryAPI.deleteCategory(category._id);
      toast.success('Category deleted successfully');
      navigate('/categories');
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Category not found</p>
      </div>
    );
  }

  const canDeleteCategory = canDelete && !category.hasChildren && category.productsCount === 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/categories')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
            {breadcrumb && (
              <p className="text-gray-600 mt-1 flex items-center">
                <FolderTree className="w-4 h-4 mr-2" />
                {breadcrumb}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {canCreate && (
            <Link
              to={`/categories/new?principal=${category.principal._id}&portfolio=${category.portfolio._id}&parent=${category._id}`}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Subcategory
            </Link>
          )}
          
          {canUpdate && (
            <Link
              to={`/categories/${category._id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Category
            </Link>
          )}
          
          {canDeleteCategory && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Category Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Principal</h3>
            <p className="text-gray-900">{category.principal.name}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Portfolio</h3>
            <p className="text-gray-900">{category.portfolio.name}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Level</h3>
            <p className="text-gray-900">Level {category.level}</p>
          </div>
          
          {category.parent && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Parent Category</h3>
              <p className="text-gray-900">{category.parent.name}</p>
            </div>
          )}
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Products Count</h3>
            <p className="text-gray-900">{category.productsCount} products</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Subcategories</h3>
            <p className="text-gray-900">{category.childrenCount} subcategories</p>
          </div>
        </div>
        
        {category.description && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
            <p className="text-gray-900">{category.description}</p>
          </div>
        )}
        
        <div className="mt-6 flex items-center justify-between">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            category.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {category.isActive ? 'Active' : 'Inactive'}
          </span>
          <div className="text-xs text-gray-500">
            Created: {new Date(category.createdAt).toLocaleDateString()} by {category.createdBy.name}
          </div>
        </div>
      </div>

      {/* Subcategories */}
      {children.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subcategories</h2>
          
          <div className="space-y-2">
            {children.map((child) => (
              <motion.div
                key={child._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <Link
                  to={`/categories/${child._id}`}
                  className="flex items-center flex-1"
                >
                  <Folder className="w-5 h-5 text-blue-500 mr-3" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{child.name}</p>
                    {child.description && (
                      <p className="text-sm text-gray-600">{child.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {child.childrenCount > 0 && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {child.childrenCount} subcategories
                      </span>
                    )}
                    {child.productsCount > 0 && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        {child.productsCount} products
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-2" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Products in Category */}
      {canViewProducts && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Products in Category</h2>
              {hasPermission('products', 'create') && (
                <Link
                  to={`/products/new?category=${category._id}`}
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Product
                </Link>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {productsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No products in this category</p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <Link
                      to={`/products/${product._id}`}
                      className="flex items-center flex-1"
                    >
                      <Package className="w-5 h-5 text-violet-500 mr-3" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">Code: {product.code}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">GST: {product.gstPercentage}%</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          product.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 ml-2" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Category</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>"{category?.name}"</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
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

export default CategoryDetails;