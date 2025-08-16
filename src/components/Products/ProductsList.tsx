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
  Package,
  FileText,
  Download,
  Filter,
  X,
  Barcode,
  Percent
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { productAPI, Product } from '../../services/productAPI';
import { categoryAPI } from '../../services/categoryAPI';
import { principalAPI } from '../../services/principalAPI';
import { portfolioAPI } from '../../services/doctorAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const ProductsList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPrincipal, setSelectedPrincipal] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [principals, setPrincipals] = useState<any[]>([]);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  
  const canCreate = hasPermission('products', 'create');
  const canUpdate = hasPermission('products', 'update');
  const canDelete = hasPermission('products', 'delete');

  useEffect(() => {
    fetchPrincipals();
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPrincipal && selectedPortfolio) {
      fetchCategories();
    }
  }, [selectedPrincipal, selectedPortfolio]);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchTerm, selectedCategory, selectedPrincipal, selectedPortfolio]);

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
      const response = await categoryAPI.getCategories({
        principal: selectedPrincipal,
        portfolio: selectedPortfolio,
        flat: true
      });
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm.trim() }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(selectedPrincipal && { principal: selectedPrincipal }),
        ...(selectedPortfolio && { portfolio: selectedPortfolio }),
      };
      
      const response = await productAPI.getProducts(params);
      
      if (response.data) {
        setProducts(response.data.products || []);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.pages || 1);
          setTotalProducts(response.data.pagination.total || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      handleApiError(error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    
    try {
      setDeleteLoading(true);
      await productAPI.deleteProduct(productToDelete._id);
      toast.success('Product deleted successfully');
      setShowDeleteModal(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadFile = async (filename: string, originalName: string) => {
    try {
      await productAPI.downloadFile(filename, originalName);
      toast.success('File download started');
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedPrincipal('');
    setSelectedPortfolio('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
          <p className="text-gray-600 mt-1">
            Manage product catalog and inventory
            {totalProducts > 0 && ` • ${totalProducts} total products`}
          </p>
        </div>
        
        {canCreate && (
          <Link
            to="/products/new"
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name, code, or specification..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
            {(searchTerm || selectedCategory || selectedPrincipal || selectedPortfolio) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Principal
                </label>
                <select
                  value={selectedPrincipal}
                  onChange={(e) => {
                    setSelectedPrincipal(e.target.value);
                    setSelectedCategory('');
                  }}
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
                  onChange={(e) => {
                    setSelectedPortfolio(e.target.value);
                    setSelectedCategory('');
                  }}
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
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!selectedPrincipal || !selectedPortfolio}
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.path ? `${category.path} > ${category.name}` : category.name}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No products found</p>
            {searchTerm && (
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your search terms or filters
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GST & Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documents
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product, index) => (
                    <motion.tr
                      key={product._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-violet-500 rounded-lg flex items-center justify-center mr-3">
                            <Package className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">Code: {product.code}</div>
                            {product.barcode && (
                              <div className="flex items-center text-xs text-gray-400 mt-1">
                                <BarCode className="w-3 h-3 mr-1" />
                                {product.barcode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{product.category.name}</div>
                        {product.categoryPath && (
                          <div className="text-xs text-gray-500 mt-1">{product.categoryPath}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <Percent className="w-3 h-3 mr-1 text-gray-400" />
                            GST: {product.gstPercentage}%
                          </div>
                          <div className="text-sm text-gray-500">
                            Unit: {product.unit}
                          </div>
                          {product.hsnCode && (
                            <div className="text-xs text-gray-400">
                              HSN: {product.hsnCode}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {product.documents.length} document(s)
                          </span>
                          {product.documents.length > 0 && (
                            <button
                              onClick={() => handleDownloadFile(
                                product.documents[0].filename,
                                product.documents[0].originalName
                              )}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded"
                              title="Download"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/products/${product._id}`}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          
                          {canUpdate && (
                            <Link
                              to={`/products/${product._id}/edit`}
                              className="text-green-600 hover:text-green-900 p-1 rounded"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}
                          
                          {canDelete && (
                            <button
                              onClick={() => {
                                setProductToDelete(product);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-200">
              {products.map((product, index) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="w-12 h-12 bg-violet-500 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">Code: {product.code}</p>
                        
                        <div className="mt-2 space-y-2">
                          <div className="text-sm text-gray-600">
                            Category: {product.category.name}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Percent className="w-4 h-4 mr-2" />
                            GST: {product.gstPercentage}%
                          </div>
                          <div className="text-sm text-gray-600">
                            Unit: {product.unit}
                          </div>
                          {product.documents.length > 0 && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FileText className="w-4 h-4 mr-2" />
                              {product.documents.length} document(s)
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3 flex items-center space-x-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            product.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Link
                        to={`/products/${product._id}`}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      
                      {canUpdate && (
                        <Link
                          to={`/products/${product._id}/edit`}
                          className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      )}
                      
                      {canDelete && (
                        <button
                          onClick={() => {
                            setProductToDelete(product);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages} • {totalProducts} total products
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <span className="px-3 py-1 text-sm font-medium">
                    {currentPage}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && productToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Product</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>"{productToDelete.name}"</strong> (Code: {productToDelete.code})? 
              This action cannot be undone and will also delete all associated documents.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setProductToDelete(null);
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

export default ProductsList;