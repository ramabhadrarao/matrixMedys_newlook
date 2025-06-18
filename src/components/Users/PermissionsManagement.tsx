import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Shield, Check, X, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { usersAPI, permissionsAPI, handleApiError } from '../../services/api';

interface Permission {
  _id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

interface UserPermission {
  permissionId: string;
  granted: boolean;
}

interface UserData {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
}

const PermissionsManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<UserData | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResource, setSelectedResource] = useState<string>('all');

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch user data, all permissions, and user's current permissions
      const [userResponse, permissionsResponse, userPermissionsResponse] = await Promise.all([
        usersAPI.getUser(id!),
        permissionsAPI.getPermissions(),
        usersAPI.getUserPermissions(id!)
      ]);

      setUser(userResponse.data);
      
      // Handle permissions response - check if it has a permissions property
      const permissionsData = permissionsResponse.data.permissions || permissionsResponse.data;
      setPermissions(permissionsData);
      
      // Handle user permissions response
      const userPermissionsData = userPermissionsResponse.data || [];
      
      // Convert user permissions to a more manageable format
      const userPerms = permissionsData.map((permission: Permission) => ({
        permissionId: permission._id,
        granted: userPermissionsData.some((up: any) => 
          (up.permissionId === permission._id) || (up._id === permission._id)
        )
      }));
      
      setUserPermissions(userPerms);
    } catch (error) {
      console.error('Error in fetchData:', error);
      handleApiError(error);
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setUserPermissions(prev => 
      prev.map(up => 
        up.permissionId === permissionId 
          ? { ...up, granted: !up.granted }
          : up
      )
    );
  };

  const handleSelectAll = (grant: boolean) => {
    const filteredPermissions = getFilteredPermissions();
    setUserPermissions(prev =>
      prev.map(up => {
        const permission = permissions.find(p => p._id === up.permissionId);
        if (permission && filteredPermissions.includes(permission)) {
          return { ...up, granted: grant };
        }
        return up;
      })
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const permissionsToGrant = userPermissions
        .filter(up => up.granted)
        .map(up => up.permissionId);

      await usersAPI.updateUserPermissions(id!, { permissions: permissionsToGrant });
      toast.success('Permissions updated successfully');
      navigate('/users');
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const getFilteredPermissions = () => {
    let filtered = permissions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(permission =>
        permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.action.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by resource
    if (selectedResource !== 'all') {
      filtered = filtered.filter(permission => permission.resource === selectedResource);
    }

    return filtered;
  };

  const getResourceCounts = () => {
    const counts: { [key: string]: { total: number; granted: number } } = {};
    
    // Ensure permissions is an array before using forEach
    if (Array.isArray(permissions)) {
      permissions.forEach(permission => {
        if (!counts[permission.resource]) {
          counts[permission.resource] = { total: 0, granted: 0 };
        }
        counts[permission.resource].total++;
        
        const userPerm = userPermissions.find(up => up.permissionId === permission._id);
        if (userPerm?.granted) {
          counts[permission.resource].granted++;
        }
      });
    }

    return counts;
  };

  const getUniqueResources = () => {
    if (!Array.isArray(permissions)) return [];
    return Array.from(new Set(permissions.map(p => p.resource))).sort();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">User not found</p>
      </div>
    );
  }

  const filteredPermissions = getFilteredPermissions();
  const resourceCounts = getResourceCounts();
  const uniqueResources = getUniqueResources();
  const grantedCount = userPermissions.filter(up => up.granted).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/users')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Manage Permissions</h1>
          <p className="text-gray-600 mt-1">
            Configure permissions for <strong>{user.name}</strong> ({user.email})
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total Permissions</div>
          <div className="text-2xl font-bold text-blue-600">{grantedCount}/{permissions.length}</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {uniqueResources.map(resource => {
          const counts = resourceCounts[resource];
          const percentage = counts.total > 0 ? (counts.granted / counts.total) * 100 : 0;
          
          return (
            <motion.div
              key={resource}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-lg p-4 border-2 transition-all cursor-pointer ${
                selectedResource === resource 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedResource(selectedResource === resource ? 'all' : resource)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 capitalize">{resource}</h3>
                  <p className="text-sm text-gray-500">{counts.granted}/{counts.total} granted</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${percentage === 100 ? 'text-green-600' : percentage > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                    {Math.round(percentage)}%
                  </div>
                </div>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${percentage === 100 ? 'bg-green-500' : percentage > 0 ? 'bg-yellow-500' : 'bg-gray-300'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Resource Filter */}
            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Resources</option>
              {uniqueResources.map(resource => (
                <option key={resource} value={resource}>
                  {resource.charAt(0).toUpperCase() + resource.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSelectAll(true)}
              className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              Grant All Visible
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Revoke All Visible
            </button>
          </div>
        </div>

        {/* Results Info */}
        {(searchTerm || selectedResource !== 'all') && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredPermissions.length} of {permissions.length} permissions
            {selectedResource !== 'all' && ` in ${selectedResource}`}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        )}
      </div>

      {/* Permissions List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {filteredPermissions.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No permissions found matching your criteria</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPermissions.map((permission, index) => {
              const userPerm = userPermissions.find(up => up.permissionId === permission._id);
              const isGranted = userPerm?.granted || false;

              return (
                <motion.div
                  key={permission._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className={`p-4 hover:bg-gray-50 transition-colors ${isGranted ? 'bg-green-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <button
                        onClick={() => handlePermissionToggle(permission._id)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                          isGranted
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {isGranted && <Check className="w-4 h-4" />}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-medium text-gray-900">{permission.name}</h3>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {permission.resource}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            permission.action === 'view' ? 'bg-blue-100 text-blue-800' :
                            permission.action === 'create' ? 'bg-green-100 text-green-800' :
                            permission.action === 'update' ? 'bg-yellow-100 text-yellow-800' :
                            permission.action === 'delete' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {permission.action}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{permission.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isGranted ? (
                        <span className="flex items-center text-green-600 text-sm font-medium">
                          <Check className="w-4 h-4 mr-1" />
                          Granted
                        </span>
                      ) : (
                        <span className="flex items-center text-gray-400 text-sm">
                          <X className="w-4 h-4 mr-1" />
                          Not granted
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-4 pt-6">
        <button
          onClick={() => navigate('/users')}
          className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Permissions
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PermissionsManagement;