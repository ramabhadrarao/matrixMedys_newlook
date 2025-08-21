import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Package,
  FileText,
  Download,
  Eye,
  Upload,
  X,
  Plus,
  Percent,
  Barcode,
  Hash
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { productAPI, Product } from '../../services/productAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState<string>('');
  
  const canUpdate = hasPermission('products', 'update');
  const canDelete = hasPermission('products', 'delete');

  useEffect(() => {
    if (id) {
      fetchProductDetails();
    }
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getProduct(id!);
      setProduct(response.product);
      setBreadcrumb(response.breadcrumb || '');
    } catch (error) {
      handleApiError(error);
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    
    try {
      setDeleteLoading(true);
      await productAPI.deleteProduct(product._id);
      toast.success('Product deleted successfully');
      navigate('/products');
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type');
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }
      
      setSelectedFile(file);
      setDocumentName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleAddDocument = async () => {
    if (!selectedFile || !id) return;
    
    try {
      setUploadingDocument(true);
      await productAPI.addDocument(id, selectedFile, documentName);
      
      // Refresh product data
      await fetchProductDetails();
      
      // Reset form
      setSelectedFile(null);
      setDocumentName('');
      setShowAddDocument(false);
      
      toast.success('Document uploaded successfully');
    } catch (error) {
      handleApiError(error);
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!id) return;
    
    try {
      setDeletingDocument(documentId);
      await productAPI.deleteDocument(id, documentId);
      
      // Update local state
      if (product) {
        setProduct({
          ...product,
          documents: product.documents.filter(doc => doc._id !== documentId)
        });
      }
      
      toast.success('Document deleted successfully');
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeletingDocument('');
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

  const handleViewFile = (filename: string) => {
    productAPI.viewFile(filename);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/products')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600 mt-1">Code: {product.code}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {canUpdate && (
            <Link
              to={`/products/${product._id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Product
            </Link>
          )}
          
          {canDelete && (
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

      {/* Product Photo */}
      {product.photo && product.photo.filename && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Photo</h2>
          <div className="flex justify-center">
            <img 
              src={`${import.meta.env.VITE_API_URL}/uploads/products/${product.photo.filename}`} 
              alt={product.name}
              className="max-w-md max-h-64 object-contain rounded-lg border border-gray-200"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* Product Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Category</h3>
            <p className="text-gray-900">{product.category.name}</p>
            {breadcrumb && (
              <p className="text-xs text-gray-500 mt-1">{breadcrumb}</p>
            )}
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Principal</h3>
            <p className="text-gray-900">{product.principal.name}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Portfolio</h3>
            <p className="text-gray-900">{product.portfolio.name}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Percent className="w-4 h-4 mr-1" />
              GST Percentage
            </h3>
            <p className="text-gray-900">{product.gstPercentage}%</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Unit</h3>
            <p className="text-gray-900">{product.unit}</p>
          </div>
          
          {product.hsnCode && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Hash className="w-4 h-4 mr-1" />
                HSN Code
              </h3>
              <p className="text-gray-900">{product.hsnCode}</p>
            </div>
          )}
          
          {product.barcode && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Barcode className="w-4 h-4 mr-1" />
                Barcode
              </h3>
              <p className="text-gray-900">{product.barcode}</p>
            </div>
          )}
          
          {product.sku && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">SKU</h3>
              <p className="text-gray-900">{product.sku}</p>
            </div>
          )}
          
          {product.mrp && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">MRP</h3>
              <p className="text-gray-900">₹{product.mrp.toFixed(2)}</p>
            </div>
          )}
          
          {product.dealerPrice && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Dealer Price</h3>
              <p className="text-gray-900">₹{product.dealerPrice.toFixed(2)}</p>
            </div>
          )}
          
          {product.defaultDiscount && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Default Discount</h3>
              <p className="text-green-600 font-medium">{product.defaultDiscount.value}{product.defaultDiscount.type === 'percentage' ? '%' : '₹'}</p>
            </div>
          )}
          
          {product.batchNo && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Batch Number</h3>
              <p className="text-gray-900">{product.batchNo}</p>
            </div>
          )}
          
          {product.mfgDate && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Manufacturing Date</h3>
              <p className="text-gray-900">{new Date(product.mfgDate).toLocaleDateString()}</p>
            </div>
          )}
          
          {product.expDate && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Expiry Date</h3>
              <p className={`font-medium ${
                new Date(product.expDate) < new Date() 
                  ? 'text-red-600' 
                  : new Date(product.expDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                  ? 'text-yellow-600'
                  : 'text-gray-900'
              }`}>
                {new Date(product.expDate).toLocaleDateString()}
                {new Date(product.expDate) < new Date() && ' (Expired)'}
                {new Date(product.expDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && 
                 new Date(product.expDate) >= new Date() && ' (Expiring Soon)'}
              </p>
            </div>
          )}
        </div>
        
        {product.specification && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Specification</h3>
            <p className="text-gray-900 whitespace-pre-wrap">{product.specification}</p>
          </div>
        )}
        
        {product.remarks && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Remarks</h3>
            <p className="text-gray-900 whitespace-pre-wrap">{product.remarks}</p>
          </div>
        )}
        
        <div className="mt-6 flex items-center justify-between">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            product.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {product.isActive ? 'Active' : 'Inactive'}
          </span>
          <div className="text-xs text-gray-500">
            Created: {new Date(product.createdAt).toLocaleDateString()} by {product.createdBy.name}
          </div>
        </div>
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
              <p className="text-gray-600 text-sm mt-1">
                Product documentation and files • {product.documents.length} document(s)
              </p>
            </div>
            
            {canUpdate && (
              <button
                onClick={() => setShowAddDocument(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6">
          {product.documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No documents uploaded</p>
              <p className="text-gray-400 text-sm mt-2">
                Upload documents to keep important product files organized
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {product.documents.map((document) => (
                <motion.div
                  key={document._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {document.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(document.size)} • {new Date(document.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {canUpdate && (
                      <button
                        onClick={() => handleDeleteDocument(document._id)}
                        disabled={deletingDocument === document._id}
                        className="text-red-600 hover:text-red-800 p-1 rounded disabled:opacity-50"
                        title="Delete Document"
                      >
                        {deletingDocument === document._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      By {document.uploadedBy.name}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleViewFile(document.filename)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded"
                        title="View File"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadFile(document.filename, document.originalName)}
                        className="text-green-600 hover:text-green-800 p-1 rounded"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Document Modal */}
      {showAddDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Add New Document</h3>
              <button
                onClick={() => {
                  setShowAddDocument(false);
                  setSelectedFile(null);
                  setDocumentName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Document Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name *
                </label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter document name"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File *
                </label>
                {selectedFile ? (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <label htmlFor="document-file" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-500 font-medium">Upload a file</span>
                      <span className="text-gray-500"> or drag and drop</span>
                    </label>
                    <input
                      id="document-file"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                      onChange={handleFileSelect}
                    />
                    <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, TXT up to 10MB</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAddDocument(false);
                  setSelectedFile(null);
                  setDocumentName('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDocument}
                disabled={!selectedFile || !documentName || uploadingDocument}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200"
              >
                {uploadingDocument ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </>
                )}
              </button>
            </div>
          </motion.div>
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Product</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>"{product?.name}"</strong> (Code: {product?.code})? 
              This action cannot be undone and will also delete all associated documents.
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

export default ProductDetails;