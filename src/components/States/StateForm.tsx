import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { statesAPI, handleApiError } from '../../services/api';

interface StateFormData {
  name: string;
  code: string;
  country: string;
  population?: number;
  area?: number;
  capital?: string;
  isActive: boolean;
}

const StateForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StateFormData>({
    defaultValues: {
      isActive: true,
    },
  });

  useEffect(() => {
    if (isEdit && id) {
      fetchState(id);
    }
  }, [id, isEdit]);

  const fetchState = async (stateId: string) => {
    try {
      setInitialLoading(true);
      const response = await statesAPI.getState(stateId);
      const state = response.data;
      
      setValue('name', state.name);
      setValue('code', state.code);
      setValue('country', state.country);
      setValue('population', state.population);
      setValue('area', state.area);
      setValue('capital', state.capital);
      setValue('isActive', state.isActive);
    } catch (error) {
      handleApiError(error);
      navigate('/states');
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data: StateFormData) => {
    setLoading(true);
    try {
      if (isEdit && id) {
        await statesAPI.updateState(id, data);
        toast.success('State updated successfully');
      } else {
        await statesAPI.createState(data);
        toast.success('State created successfully');
      }
      navigate('/states');
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/states')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit State' : 'Add New State'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update state information' : 'Create a new geographical state entry'}
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
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                State Name *
              </label>
              <input
                {...register('name', {
                  required: 'State name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter state name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                State Code *
              </label>
              <input
                {...register('code', {
                  required: 'State code is required',
                  minLength: {
                    value: 2,
                    message: 'Code must be at least 2 characters',
                  },
                  maxLength: {
                    value: 5,
                    message: 'Code must not exceed 5 characters',
                  },
                })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                placeholder="Enter state code"
                style={{ textTransform: 'uppercase' }}
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                Country *
              </label>
              <input
                {...register('country', {
                  required: 'Country is required',
                  minLength: {
                    value: 2,
                    message: 'Country must be at least 2 characters',
                  },
                })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter country name"
              />
              {errors.country && (
                <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="capital" className="block text-sm font-medium text-gray-700 mb-2">
                Capital City
              </label>
              <input
                {...register('capital')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter capital city"
              />
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="population" className="block text-sm font-medium text-gray-700 mb-2">
                Population
              </label>
              <input
                {...register('population', {
                  min: {
                    value: 0,
                    message: 'Population cannot be negative',
                  },
                  valueAsNumber: true,
                })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter population"
              />
              {errors.population && (
                <p className="mt-1 text-sm text-red-600">{errors.population.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-2">
                Area (km²)
              </label>
              <input
                {...register('area', {
                  min: {
                    value: 0,
                    message: 'Area cannot be negative',
                  },
                  valueAsNumber: true,
                })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter area in square kilometers"
              />
              {errors.area && (
                <p className="mt-1 text-sm text-red-600">{errors.area.message}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center">
              <input
                {...register('isActive')}
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Active State</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Inactive states will be hidden from public listings
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/states')}
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
                  {isEdit ? 'Update State' : 'Create State'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default StateForm;