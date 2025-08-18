// src/components/Categories/CategoryForm.tsx - Fixed for proper subcategory creation
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  FolderTree,
  Plus,
  AlertCircle,
  Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { categoryAPI, CategoryFormData } from '../../services/categoryAPI';
import { principalAPI } from '../../services/principalAPI';
import { portfolioAPI } from '../../services/doctorAPI';
import { handleApiError } from '../../services/api';

const CategoryForm: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [principals, setPrincipals] = useState<any[]>([]);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [parentCategories, setParentCategories] = useState<any[]>([]);
  const [parentCategory, setParentCategory] = useState<any>(null);
  const [formInitialized, setFormInitialized] = useState(false);
  
  const urlPrincipal = searchParams.get('principal') || '';
  const urlPortfolio = searchParams.get('portfolio') || '';
  const urlParent = searchParams.get('parent') || '';
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm<CategoryFormData>();

  const watchPrincipal = watch('principal');
  const watchPortfolio = watch('portfolio');
  const watchParent = watch('parent');

  // Initialize form
  useEffect(() => {
    initializeForm();
  }, []);

  // Watch for principal/portfolio changes
  useEffect(() => {
    if (formInitialized && watchPrincipal && watchPortfolio && !isEdit) {
      loadParentCategories(watchPrincipal, watchPortfolio);
    }
  }, [watchPrincipal, watchPortfolio, formInitialized]);

  // Load parent category details when parent changes
  useEffect(() => {
    if (watchParent && !isEdit) {
      loadParentCategoryDetails(watchParent);
    }
  }, [watchParent]);

  const loadParentCategoryDetails = async (parentId: string) => {
    try {
      const response = await categoryAPI.getCategory(parentId);
      setParentCategory(response.data.category);
    } catch (error) {
      console.error('Error loading parent category:', error);
    }
  };

  const initializeForm = async () => {
    try {
      setInitialLoading(true);
      
      // Load principals and portfolios
      const [principalsRes, portfoliosRes] = await Promise.all([
        principalAPI.getPrincipals({ limit: 100 }),
        portfolioAPI.getPortfolios({ limit: 100 })
      ]);
      
      setPrincipals(principalsRes.data.principals || []);
      setPortfolios(portfoliosRes.data.portfolios || []);
      
      if (isEdit && id) {
        // Load category for editing
        await loadCategory(id);
      } else {
        // If parent is specified in URL, load its details first
        if (urlParent) {
          try {
            const parentResponse = await categoryAPI.getCategory(urlParent);
            const parentCat = parentResponse.data.category;
            setParentCategory(parentCat);
            
            // Use parent's principal and portfolio
            const principalId = parentCat.principal._id || parentCat.principal;
            const portfolioId = parentCat.portfolio._id || parentCat.portfolio;
            
            // Load parent categories for this principal/portfolio
            await loadParentCategories(principalId, portfolioId, urlParent);
            
            // Set form values with parent's principal and portfolio
            reset({
              name: '',
              description: '',
              principal: principalId,
              portfolio: portfolioId,
              parent: urlParent,
              sortOrder: 0,
              isActive: true
            });
          } catch (error) {
            console.error('Error loading parent category:', error);
            // Fallback to URL params if parent load fails
            reset({
              name: '',
              description: '',
              principal: urlPrincipal,
              portfolio: urlPortfolio,
              parent: urlParent,
              sortOrder: 0,
              isActive: true
            });
          }
        } else {
          // No parent specified, use URL params
          reset({
            name: '',
            description: '',
            principal: urlPrincipal,
            portfolio: urlPortfolio,
            parent: '',
            sortOrder: 0,
            isActive: true
          });
          
          // Load parent categories if principal and portfolio are provided
          if (urlPrincipal && urlPortfolio) {
            await loadParentCategories(urlPrincipal, urlPortfolio);
          }
        }
      }
      
      setFormInitialized(true);
    } catch (error) {
      console.error('Error initializing form:', error);
      handleApiError(error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadCategory = async (categoryId: string) => {
    try {
      const response = await categoryAPI.getCategory(categoryId);
      const category = response.data.category;
      
      // Load parent categories first
      if (category.principal && category.portfolio) {
        const principalId = typeof category.principal === 'object' ? category.principal._id : category.principal;
        const portfolioId = typeof category.portfolio === 'object' ? category.portfolio._id : category.portfolio;
        await loadParentCategories(principalId, portfolioId);
      }
      
      // Then set form values
      reset({
        name: category.name,
        description: category.description || '',
        principal: typeof category.principal === 'object' ? category.principal._id : category.principal,
        portfolio: typeof category.portfolio === 'object' ? category.portfolio._id : category.portfolio,
        parent: category.parent ? (typeof category.parent === 'object' ? category.parent._id : category.parent) : '',
        sortOrder: category.sortOrder || 0,
        isActive: category.isActive !== false
      });
      
    } catch (error) {
      console.error('Error loading category:', error);
      handleApiError(error);
      navigate('/categories');
    }
  };

  const loadParentCategories = async (principalId: string, portfolioId: string, parentToSelect?: string) => {
    try {
      console.log('Loading categories for principal:', principalId, 'portfolio:', portfolioId);
      
      const response = await categoryAPI.getCategories({
        principal: principalId,
        portfolio: portfolioId,
        flat: true
      });
      
      let categories = response.data.categories || [];
      
      // Filter out current category if editing
      if (isEdit && id) {
        categories = categories.filter(cat => {
          if (cat._id === id) return false;
          // Check if this category is a descendant
          if (cat.ancestors && Array.isArray(cat.ancestors)) {
            return !cat.ancestors.some((ancestor: any) => {
              const ancestorId = typeof ancestor === 'string' ? ancestor : ancestor._id;
              return ancestorId === id;
            });
          }
          return true;
        });
      }
      
      setParentCategories(categories);
      
      // Set parent if specified
      if (parentToSelect) {
        setValue('parent', parentToSelect);
      }
      
    } catch (error) {
      console.error('Error loading parent categories:', error);
      setParentCategories([]);
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    console.log('Form submission data:', data);
    
    // Validate required fields
    if (!data.name?.trim()) {
      toast.error('Category name is required');
      return;
    }
    
    if (!data.principal) {
      toast.error('Principal is required');
      return;
    }
    
    if (!data.portfolio) {
      toast.error('Portfolio is required');
      return;
    }
    
    setLoading(true);
    
    try {
      // Clean and prepare the data
      const payload: any = {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        principal: data.principal,
        portfolio: data.portfolio,
        sortOrder: parseInt(data.sortOrder?.toString() || '0', 10),
        isActive: data.isActive !== false
      };
      
      // Only add parent if it has a value
      if (data.parent && data.parent.trim() !== '') {
        payload.parent = data.parent;
      }
      
      console.log('Sending to API:', payload);
      
      let response;
      if (isEdit && id) {
        response = await categoryAPI.updateCategory(id, payload);
        toast.success('Category updated successfully');
        navigate('/categories');
      } else {
        response = await categoryAPI.createCategory(payload);
        toast.success('Category created successfully');
        
        // Ask if user wants to create subcategory
        const createdCategory = response.data.category;
        if (createdCategory) {
          setTimeout(() => {
            if (window.confirm(`Category "${createdCategory.name}" created! Would you like to add a subcategory under it?`)) {
              // Navigate to create new subcategory under the just created category
              navigate(`/categories/new?parent=${createdCategory._id}`);
            } else {
              navigate('/categories');
            }
          }, 500);
        } else {
          navigate('/categories');
        }
      }
    } catch (error: any) {
      console.error('Category submission error:', error);
      
      // Extract detailed error message
      let errorMessage = 'Failed to save category';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        console.log('Server error response:', errorData);
        
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors
            .map((e: any) => e.msg || e.message || e.param)
            .join(', ');
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const buildCategoryPath = () => {
    if (!parentCategory) return null;
    
    const pathParts = [];
    if (parentCategory.path) {
      pathParts.push(parentCategory.path);
    }
    pathParts.push(parentCategory.name);
    
    return pathParts.join(' > ');
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  const selectedParent = parentCategories.find(c => c._id === watchParent);
  const categoryPath = buildCategoryPath();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/categories')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Category' : parentCategory ? 'Create Subcategory' : 'Create New Category'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit 
              ? 'Update category information' 
              : parentCategory 
                ? `Adding subcategory under "${parentCategory.name}"`
                : 'Add a new category to your product catalog'}
          </p>
        </div>
      </div>

      {/* Parent Category Info */}
      {parentCategory && !isEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Layers className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-2">Category Hierarchy</p>
              <div className="space-y-1">
                {categoryPath && (
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Path:</span> {categoryPath}
                  </p>
                )}
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Level:</span> {(parentCategory.level || 0) + 1}
                </p>
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Principal:</span> {
                    typeof parentCategory.principal === 'object' 
                      ? parentCategory.principal.name 
                      : principals.find(p => p._id === parentCategory.principal)?.name || 'N/A'
                  }
                </p>
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Portfolio:</span> {
                    typeof parentCategory.portfolio === 'object' 
                      ? parentCategory.portfolio.name 
                      : portfolios.find(p => p._id === parentCategory.portfolio)?.name || 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Principal and Portfolio - Read-only when parent is set */}
          {(!parentCategory || isEdit) && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Organization</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Principal <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('principal', { required: 'Principal is required' })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.principal ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isEdit || !!parentCategory}
                  >
                    <option value="">Select Principal</option>
                    {principals.map((principal) => (
                      <option key={principal._id} value={principal._id}>
                        {principal.name}
                      </option>
                    ))}
                  </select>
                  {errors.principal && (
                    <p className="mt-1 text-sm text-red-600">{errors.principal.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portfolio <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('portfolio', { required: 'Portfolio is required' })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.portfolio ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isEdit || !!parentCategory}
                  >
                    <option value="">Select Portfolio</option>
                    {portfolios.map((portfolio) => (
                      <option key={portfolio._id} value={portfolio._id}>
                        {portfolio.name}
                      </option>
                    ))}
                  </select>
                  {errors.portfolio && (
                    <p className="mt-1 text-sm text-red-600">{errors.portfolio.message}</p>
                  )}
                </div>
              </div>
              
              {parentCategory && (
                <p className="mt-2 text-sm text-gray-500">
                  * Principal and Portfolio are inherited from parent category
                </p>
              )}
            </div>
          )}

          {/* Category Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Category Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('name', { 
                      required: 'Category name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters'
                      }
                    })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter category name"
                    autoFocus
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Category
                  </label>
                  {(!watchPrincipal || !watchPortfolio) && !parentCategory ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                      <span className="text-gray-500 text-sm flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Select principal and portfolio first
                      </span>
                    </div>
                  ) : (
                    <select
                      {...register('parent')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isEdit || !!urlParent}
                    >
                      <option value="">None (Root Category)</option>
                      {parentCategories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.level > 0 && '— '.repeat(category.level)}
                          {category.path ? `${category.path} > ` : ''}{category.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {urlParent && (
                    <p className="mt-1 text-sm text-gray-500">
                      * Parent category is pre-selected
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    {...register('sortOrder')}
                    type="number"
                    min="0"
                    defaultValue="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      {...register('isActive')}
                      type="checkbox"
                      defaultChecked={true}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/categories')}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!watchPrincipal && !parentCategory) || (!watchPortfolio && !parentCategory)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEdit ? 'Update' : 'Create'} Category
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;