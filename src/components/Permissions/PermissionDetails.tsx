// src/components/Permissions/PermissionDetails.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Shield, 
  Calendar,
  User,
  Tag,
  FileText,
  Users,
  Activity
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { permissionAPI, Permission } from '../../services/permissionAPI';
import toast from 'react-hot-toast';

const PermissionDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuthStore();
  
  const [permission, setPermission] = useState<Permission | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  
  const canUpdate = hasPermission('permissions', 'update');
  const canDelete = hasPermission('permissions', 'delete');

  useEffect(() => {
    if (id) {
      fetchPermissionDetails();
      fetchPermissionStats();
    }
  }, [id]);

  const fetchPermissionDetails = async () => {
    try {
      setLoading(true);
      const data = await permissionAPI.getPermission(id!);
      setPermission(data);
    } catch (error) {
      console.error('Error fetching permission:', error);
      toast.error('Failed to fetch permission details');
      navigate('/permissions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissionStats = async () => {
    try {
      const data = await permissionAPI.getPermissionStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching permission stats:', error);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!permission) return;

    try {
      setDeleteLoading(true);
      await permissionAPI.deletePermission(permission._id);
      toast.success('Permission deleted successfully');
      navigate('/permissions');
    } catch (error: any) {
      console.error('Error deleting permission:', error);
      toast.error(error.response?.data?.message || 'Failed to delete permission');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'view': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'create': return 'bg-green-100 text-green-800 border-green-200';
      case 'update': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'delete': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getResourceColor = (resource: string) => {
    const colors = [
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200',
      'bg-orange-100 text-orange-800 border-orange-200',
    ];
    const index = resource.length % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!permission) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Permission not found</h3>
        <p className="text-gray-600 mb-4">The permission you're looking for doesn't exist.</p>
        <Link
          to="/permissions"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Permissions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
              {permission.name}
            </h1>
            <p className="text-gray-600 mt-1">Permission details and information</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {canUpdate && (
            <Link
              to={`/permissions/${permission._id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          )}
          
          {canDelete && (
            <button
              onClick={handleDeleteClick}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permission Name
                </label>
                <p className="text-gray-900 font-medium">{permission.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource
                </label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getResourceColor(permission.resource)}`}>
                  <Tag className="h-3 w-3 mr-1" />
                  {permission.resource}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getActionColor(permission.action)}`}>
                  <Activity className="h-3 w-3 mr-1" />
                  {permission.action}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Created Date
                </label>
                <p className="text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {new Date(permission.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            {permission.description && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {permission.description}
                </p>
              </div>
            )}
          </div>

          {/* Created By Information */}
          {permission.createdBy && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Created By
              </h2>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{permission.createdBy.name}</p>
                  <p className="text-sm text-gray-500">{permission.createdBy.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          {stats && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                System Stats
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Permissions</span>
                  <span className="font-semibold text-gray-900">{stats.totalPermissions}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Resources</span>
                  <span className="font-semibold text-gray-900">{stats.totalResources}</span>
                </div>
                
                {stats.mostUsedPermissions && stats.mostUsedPermissions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Most Used Permissions</h4>
                    <div className="space-y-2">
                      {stats.mostUsedPermissions.slice(0, 3).map((perm: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 truncate">{perm.name}</span>
                          <span className="font-medium text-gray-900">{perm.usageCount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resource Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Information</h3>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Resource Type:</span>
                <p className="font-medium text-gray-900 capitalize">{permission.resource}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Action Type:</span>
                <p className="font-medium text-gray-900 capitalize">{permission.action}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Permission Level:</span>
                <p className="font-medium text-gray-900">
                  {permission.action === 'view' ? 'Read Only' :
                   permission.action === 'create' ? 'Create Access' :
                   permission.action === 'update' ? 'Modify Access' :
                   permission.action === 'delete' ? 'Delete Access' : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Delete Permission</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete the permission "{permission.name}"? 
                This will remove the permission from all users who currently have it.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Permission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionDetails;