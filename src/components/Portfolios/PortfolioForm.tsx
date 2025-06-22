// src/components/Portfolios/PortfolioForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { portfolioAPI } from '../../services/doctorAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface PortfolioFormData {
  name: string;
  description: string;
  isActive: boolean;
}

const PortfolioForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('portfolios', 'create');
  const canUpdate = hasPermission('portfolios', 'update');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PortfolioFormData>({
    defaultValues: {
      isActive: true,
    },
  });

  useEffect(() => {
    if (isEdit && id) {
      fetchPortfolio(id);
    }
  }, [id, isEdit]);

  const fetchPortfolio = async (portfolioId: string) => {
    try {
      setInitialLoading(true);
      const response = await portfolioAPI.getPortfolio(portfolioId);
      const portfolio = response.data;
      
      setValue('name', portfolio.name);
      setValue('description', portfolio.description);
      setValue('isActive', portfolio.isActive);
    } catch (error) {
      handleApiError(error);
      navigate('/portfolios');
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data: PortfolioFormData) => {
    setLoading(true);
    try {
      if (isEdit && id) {
        await portfolioAPI.updatePortfolio(id, data);
        toast.success('Portfolio updated successfully');
      } else {
        await portfolioAPI.createPortfolio(data);
        toast.success('Portfolio created successfully');
      }
      navigate('/portfolios');
    } catch (error) {
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

  if ((!canCreate && !isEdit) || (!canUpdate && isEdit)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">You don't have permission to {isEdit ? 'edit' : 'create'} portfolios</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/portfolios')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Portfolio' : 'Add New Portfolio'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update portfolio information' : 'Create a new medical specialization portfolio'}
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
          {/* Portfolio Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Portfolio Name *
            </label>
            <input
              {...register('name', {
                required: 'Portfolio name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters',
                },
                maxLength: {
                  value: 100,
                  message: 'Name must not exceed 100 characters',
                },
              })}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter portfolio name (e.g., Cardiology, Neurology)"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              {...register('description', {
                required: 'Description is required',
                minLength: {
                  value: 5,
                  message: 'Description must be at least 5 characters',
                },
                maxLength: {
                  value: 500,
                  message: 'Description must not exceed 500 characters',
                },
              })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Enter detailed description of the portfolio/specialization"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Provide a clear description of this medical specialization or portfolio
            </p>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Status
            </h3>
            
            <div>
              <label className="flex items-center">
                <input
                  {...register('isActive')}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Active Portfolio</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Inactive portfolios will be hidden from doctor assignment options
              </p>
            </div>
          </div>

          {/* Examples Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Portfolio Examples</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div><strong>Cardiology:</strong> Heart and cardiovascular system specialist</div>
              <div><strong>Neurology:</strong> Brain and nervous system specialist</div>
              <div><strong>Pediatrics:</strong> Medical care for infants, children, and adolescents</div>
              <div><strong>Oncology:</strong> Cancer diagnosis and treatment specialist</div>
              <div><strong>Orthopedics:</strong> Musculoskeletal system specialist</div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/portfolios')}
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
                  {isEdit ? 'Update Portfolio' : 'Create Portfolio'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default PortfolioForm;