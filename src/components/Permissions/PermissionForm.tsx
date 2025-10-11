// src/components/Permissions/PermissionForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { permissionAPI, Permission, PermissionFormData } from '../../services/permissionAPI';
import toast from 'react-hot-toast';

const PermissionForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuthStore();
  
  const isEditing = Boolean(id);
  const canCreate = hasPermission('permissions', 'create');
  const canUpdate = hasPermission('permissions', 'update');
  
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState<PermissionFormData>({
    name: '',
    description: '',
    resource: '',
    action: 'view'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingResources, setExistingResources] = useState<string[]>([]);

  useEffect(() => {
    if (isEditing && id) {
      fetchPermission();
    }
    fetchExistingResources();
  }, [id, isEditing]);

  const fetchPermission = async () => {
    try {
      setLoading(true);
      const permission = await permissionAPI.getPermission(id!);
      setFormData({
        name: permission.name,
        description: permission.description,
        resource: permission.resource,
        action: permission.action
      });
    } catch (error) {
      console.error('Error fetching permission:', error);
      toast.error('Failed to fetch permission details');
      navigate('/permissions');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingResources = async () => {
    try {
      const response = await permissionAPI.getPermissions({ limit: 1000 });
      const uniqueResources = [...new Set(response.permissions.map(p => p.resource))];
      setExistingResources(uniqueResources);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Permission name is required';
    }

    if (!formData.resource.trim()) {
      newErrors.resource = 'Resource is required';
    }

    if (!formData.action) {
      newErrors.action = 'Action is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (isEditing && !canUpdate) {
      toast.error('You do not have permission to update permissions');
      return;
    }

    if (!isEditing && !canCreate) {
      toast.error('You do not have permission to create permissions');
      return;
    }

    try {
      setSubmitLoading(true);
      
      if (isEditing) {
        await permissionAPI.updatePermission(id!, formData);
        toast.success('Permission updated successfully');
      } else {
        await permissionAPI.createPermission(formData);
        toast.success('Permission created successfully');
      }
      
      navigate('/permissions');
    } catch (error: any) {
      console.error('Error saving permission:', error);
      toast.error(error.response?.data?.message || 'Failed to save permission');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleInputChange = (field: keyof PermissionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const generatePermissionName = () => {
    if (formData.resource && formData.action) {
      const name = `${formData.resource}_${formData.action}`;
      setFormData(prev => ({ ...prev, name }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/permissions')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-8 w-8 text-orange-600" />
            {isEditing ? 'Edit Permission' : 'Add New Permission'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? 'Update permission details' : 'Create a new system permission'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Resource and Action Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.resource}
                  onChange={(e) => handleInputChange('resource', e.target.value)}
                  placeholder="e.g., users, products, categories"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.resource ? 'border-red-500' : 'border-gray-300'
                  }`}
                  list="resources-list"
                />
                <datalist id="resources-list">
                  {existingResources.map((resource) => (
                    <option key={resource} value={resource} />
                  ))}
                </datalist>
                {errors.resource && (
                  <p className="text-red-500 text-sm">{errors.resource}</p>
                )}
                <p className="text-gray-500 text-sm">
                  The system resource this permission applies to
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.action}
                onChange={(e) => handleInputChange('action', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.action ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="view">View</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
              {errors.action && (
                <p className="text-red-500 text-sm">{errors.action}</p>
              )}
              <p className="text-gray-500 text-sm">
                The type of action this permission allows
              </p>
            </div>
          </div>

          {/* Permission Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permission Name <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., users_view, products_create"
                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={generatePermissionName}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Generate
              </button>
            </div>
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
            <p className="text-gray-500 text-sm mt-1">
              Unique identifier for this permission (usually resource_action)
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this permission allows users to do..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-gray-500 text-sm mt-1">
              Optional description of what this permission grants access to
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/permissions')}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={submitLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {submitLoading ? 'Saving...' : (isEditing ? 'Update Permission' : 'Create Permission')}
            </button>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Permission Guidelines</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use lowercase resource names (e.g., "users", "products", "categories")</li>
          <li>• Permission names should follow the pattern: resource_action</li>
          <li>• Choose the appropriate action: view, create, update, or delete</li>
          <li>• Provide clear descriptions to help administrators understand the permission</li>
          <li>• Avoid creating duplicate permissions for the same resource-action combination</li>
        </ul>
      </div>
    </div>
  );
};

export default PermissionForm;