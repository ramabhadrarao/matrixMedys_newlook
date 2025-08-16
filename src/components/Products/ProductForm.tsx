import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  Upload,
  X,
  FileText,
  Plus,
  Trash2,
  Download,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { productAPI, ProductFormData } from '../../services/productAPI';
import { categoryAPI } from '../../services/categoryAPI';
import { principalAPI } from '../../services/principalAPI';
import { portfolioAPI } from '../../services/doctorAPI';
import { handleApiError } from '../../services/api';

interface FileWithMetadata {
  file: File;
  name: string;
  id: string;
}

const ProductForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [principals, setPrincipals] = useState<any[]>([]);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedPrincipal, setSelectedPrincipal] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteDocumentLoading, setDeleteDocumentLoading] = useState<string>('');
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: {
      isActive: true,
      unit: 'PCS',
      gstPercentage: 18,
    },
  });

  const watchCategory = watch('category');

  useEffect(() => {
    fetchPrincipals();
    fetchPortfolios();
    
    if (isEdit && id) {
      fetchProduct(id);
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (selectedPrincipal && selectedPortfolio) {
      fetchCategories();
    }
  }, [selectedPrincipal, selectedPortfolio]);

  useEffect(() => {
    if (watchCategory && categories.length > 0) {
      const category = categories.find(c => c._id === watchCategory);
      if (category) {
        setSelectedPrincipal(category.principal._id);
        setSelectedPortfolio(category.portfolio._id);
      }
    }
  }, [watchCategory, categories]);

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

  const fetchProduct = async (productId: string) => {
    try {
      setInitialLoading(true);
      const response = await productAPI.getProduct(productId);
      const product = response.data.product;
      
      setValue('name', product.name);
      setValue('code', product.code);
      setValue('category', product.category._id);
      setValue('gstPercentage', product.gstPercentage);
      setValue('specification', product.specification);
      setValue('remarks', product.remarks);
      setValue('unit', product.unit);
      setValue('hsnCode', product.hsnCode);
      setValue('barcode', product.barcode);
      setValue('isActive', product.isActive);
      
      setSelectedPrincipal(product.principal._id);
      setSelectedPortfolio(product.portfolio._id);
      setExistingDocuments(product.documents || []);
      
      // Load categories for this principal and portfolio
      const catResponse = await categoryAPI.getCategories({
        principal: product.principal._id,
        portfolio: product.portfolio._id,
        flat: true
      });
      setCategories(catResponse.data.categories || []);
    } catch (error) {
      handleApiError(error);
      navigate('/products');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles: FileWithMetadata[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
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
          toast.error(`Invalid file type for ${file.name}`);
          continue;
        }
        
        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }
        
        newFiles.push({
          file,
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          id: `${Date.now()}-${i}`
        });
      }
      
      if (newFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...newFiles]);
        toast.success(`${newFiles.length} file(s) selected`);
      }
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const updateFileName = (fileId: string, name: string) => {
    setSelectedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, name } : f
    ));
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!id) return;
    
    try {
      setDeleteDocumentLoading(documentId);
      await productAPI.deleteDocument(id, documentId);
      setExistingDocuments(prev => prev.filter(doc => doc._id !== documentId));
      toast.success('Document deleted successfully');
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteDocumentLoading('');
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

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    setUploadProgress(0);
    
    try {
      const formData: ProductFormData = {
        ...data,
        documents: selectedFiles.map(f => f.file),
        documentNames: selectedFiles.map(f => f.name),
      };

      if (isEdit && id) {
        await productAPI.updateProduct(id, formData, setUploadProgress);
        toast.success('Product updated successfully');
      } else {
        await productAPI.createProduct(formData, setUploadProgress);
        toast.success('Product created successfully');
      }
      
      navigate('/products');
    } catch (error: any) {
      console.error('Submit error:', error);
      handleApiError(error);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/products')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update product information' : 'Create a new product entry'}
          </p>
        </div>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Category Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Category Selection
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Principal
                </label>
                <select
                  value={selectedPrincipal}
                  onChange={(e) => {
                    setSelectedPrincipal(e.target.value);
                    setValue('category', '');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isEdit}
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
                  Portfolio
                </label>
                <select
                  value={selectedPortfolio}
                  onChange={(e) => {
                    setSelectedPortfolio(e.target.value);
                    setValue('category', '');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isEdit}
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
                  Category *
                </label>
                <select
                  {...register('category', {
                    required: 'Category is required',
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!selectedPrincipal || !selectedPortfolio || isEdit}
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.path ? `${category.path} > ${category.name}` : category.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Product Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  {...register('name', {
                    required: 'Product name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Code *
                </label>
                <input
                  {...register('code', {
                    required: 'Product code is required',
                    minLength: {
                      value: 2,
                      message: 'Code must be at least 2 characters',
                    },
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  placeholder="Enter product code"
                  style={{ textTransform: 'uppercase' }}
                />
                {errors.code && (
                  <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Percentage *
                </label>
                <input
                  {...register('gstPercentage', {
                    required: 'GST percentage is required',
                    valueAsNumber: true,
                    min: {
                      value: 0,
                      message: 'GST must be 0 or greater',
                    },
                    max: {
                      value: 100,
                      message: 'GST must be 100 or less',
                    },
                  })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="18"
                />
                {errors.gstPercentage && (
                  <p className="mt-1 text-sm text-red-600">{errors.gstPercentage.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <select
                  {...register('unit')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="PCS">PCS - Pieces</option>
                  <option value="BOX">BOX - Box</option>
                  <option value="KG">KG - Kilogram</option>
                  <option value="GM">GM - Gram</option>
                  <option value="LTR">LTR - Liter</option>
                  <option value="ML">ML - Milliliter</option>
                  <option value="MTR">MTR - Meter</option>
                  <option value="CM">CM - Centimeter</option>
                  <option value="DOZEN">DOZEN - Dozen</option>
                  <option value="PACK">PACK - Pack</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HSN Code
                </label>
                <input
                  {...register('hsnCode')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter HSN code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Barcode
                </label>
                <input
                  {...register('barcode')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter barcode"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specification
                </label>
                <textarea
                  {...register('specification')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product specification"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  {...register('remarks')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter any remarks"
                />
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Documents
            </h3>

            {/* Existing Documents */}
            {existingDocuments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-3">Existing Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {existingDocuments.map((doc) => (
                    <div key={doc._id} className="p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-gray-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {doc.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(doc.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc._id)}
                          disabled={deleteDocumentLoading === doc._id}
                          className="text-red-600 hover:text-red-800 p-1 rounded disabled:opacity-50"
                          title="Delete Document"
                        >
                          {deleteDocumentLoading === doc._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleViewFile(doc.filename)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded"
                          title="View File"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(doc.filename, doc.originalName)}
                          className="text-green-600 hover:text-green-800 p-1 rounded"
                          title="Download"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Files */}
            {selectedFiles.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-3">New Documents to Upload</h4>
                <div className="space-y-2">
                  {selectedFiles.map((fileData) => (
                    <div key={fileData.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <input
                            type="text"
                            value={fileData.name}
                            onChange={(e) => updateFileName(fileData.id, e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Document name"
                          />
                          <span className="text-xs text-gray-500">
                            {formatFileSize(fileData.file.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(fileData.id)}
                          className="ml-2 text-red-600 hover:text-red-800 p-1 rounded"
                          title="Remove File"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <label htmlFor="product-files" className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-500 font-medium">Upload documents</span>
                <span className="text-gray-500"> or drag and drop</span>
              </label>
              <input
                ref={fileInputRef}
                id="product-files"
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                onChange={handleFileSelect}
              />
              <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, TXT up to 10MB each</p>
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Uploading...</span>
                  <span className="text-gray-600">{uploadProgress}%</span>
                </div>
                <div className="mt-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center">
              <input
                {...register('isActive')}
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Active Product</span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : (isEdit ? 'Updating...' : 'Creating...')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEdit ? 'Update Product' : 'Create Product'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ProductForm;