import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  FolderTree
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
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [principals, setPrincipals] = useState<any[]>([]);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [parentCategories, setParentCategories] = useState<any[]>([]);
  const [selectedPrincipal, setSelectedPrincipal] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState('');
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormData>({
    defaultValues: {
      isActive: true,
      sortOrder: 0,
    },
  });

  const watchPrincipal = watch('principal');
  const watchPortfolio = watch('portfolio');

  useEffect(() => {
    fetchPrincipals();
    fetchPortfolios();
    
    // Set initial values from query params
    const principalFromQuery = searchParams.get('principal');
    const portfolioFromQuery = searchParams.get('portfolio');
    
    if (principalFromQuery) {
      setValue('principal', principalFromQuery);
      setSelectedPrincipal(principalFromQuery);
    }
    if (portfolioFromQuery) {
      setValue('portfolio', portfolioFromQuery);
      setSelectedPortfolio(portfolioFromQuery);
    }
    
    if (isEdit && id) {
      fetchCategory(id);
    }
  }, [id, isEdit, searchParams]);

  useEffect(() => {
    if (watchPrincipal && watchPortfolio) {
      fetchParentCategories(watchPrincipal, watchPortfolio);
    }
  }, [watchPrincipal, watchPortfolio]);

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

  const fetchParentCategories = async (principalId: string, portfolioId: string) => {
    try {
      const response = await categoryAPI.getCategories({
        principal: principalId,
        portfolio: portfolioId,
        flat: true
      });
      // Filter out current category if editing
      const categories = response.data.categories || [];
      if (isEdit && id) {
        setParentCategories(categories.filter(cat => cat._id !== id));
      } else {
        setParentCategories(categories);
      }
    } catch (error) {
      console.error('Error fetching parent categories:', error);
    }
  };

  const fetchCategory = async (categoryId: string) => {
    try {
      setInitialLoading(true);
      const response = await categoryAPI.getCategory(categoryId);
      const category = response.data.category;
      
      setValue('name', category.name);
      setValue('description', category.description);
      setValue('principal', category.principal._id);
      setValue('portfolio', category.portfolio._id);
      setValue('parent', category.parent?._id || '');
      setValue('sortOrder', category.sortOrder);
      setValue('isActive', category.isActive);
      
      setSelectedPrincipal(category.principal._id);
      setSelectedPortfolio(category.portfolio._id);
    } catch (error) {
      handleApiError(error);
      navigate('/categories');
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    setLoading(true);
    
    try {
      const formData: CategoryFormData = {
        ...data,
        parent: data.parent || null,
      };

      if (isEdit && id) {
        await categoryAPI.updateCategory(id, formData);
        toast.success('Category updated successfully');
      } else {
        await categoryAPI.createCategory(formData);
        toast.success('Category created successfully');
      }
      
      navigate('/categories');
    } catch (error: any) {
      console.error('Submit error:', error);
      handleApiError(error);
    } finally {
      setLoading(false);
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
            {isEdit ? 'Edit Category' : 'Add New Category'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update category information' : 'Create a new product category'}
          </p>
        </div>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Principal and Portfolio Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Principal *
              </label>
              <select
                {...register('principal', {
                  required: 'Principal is required',
                })}
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
              {errors.principal && (
                <p className="mt-1 text-sm text-red-600">{errors.principal.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portfolio *
              </label>
              <select
                {...register('portfolio', {
                  required: 'Portfolio is required',
                })}
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
              {errors.portfolio && (
                <p className="mt-1 text-sm text-red-600">{errors.portfolio.message}</p>
              )}
            </div>
          </div>

          {/* Category Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Category Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  {...register('name', {
                    required: 'Category name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter category name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Category
                </label>
                <select
                  {...register('parent')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Parent (Root Category)</option>
                  {parentCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.path ? `${category.path} > ${category.name}` : category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter category description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order
                </label>
                <input
                  {...register('sortOrder', {
                    valueAsNumber: true,
                    min: {
                      value: 0,
                      message: 'Sort order must be 0 or greater',
                    },
                  })}
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
                {errors.sortOrder && (
                  <p className="mt-1 text-sm text-red-600">{errors.sortOrder.message}</p>
                )}
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    {...register('isActive')}
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active Category</span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/categories')}
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
                  {isEdit ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEdit ? 'Update Category' : 'Create Category'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CategoryForm;