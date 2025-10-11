// src/services/permissionAPI.ts
import api from './api';

export interface Permission {
  _id: string;
  name: string;
  description: string;
  resource: string;
  action: 'view' | 'create' | 'update' | 'delete';
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PermissionFormData {
  name: string;
  description: string;
  resource: string;
  action: 'view' | 'create' | 'update' | 'delete';
}

export interface PermissionListResponse {
  permissions: Permission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PermissionStats {
  totalPermissions: number;
  totalResources: number;
  permissionsByResource: Array<{
    resource: string;
    count: number;
  }>;
  permissionsByAction: Array<{
    action: string;
    count: number;
  }>;
  mostUsedPermissions: Array<{
    _id: string;
    name: string;
    usageCount: number;
  }>;
  recentPermissions: Permission[];
}

export interface GetPermissionsParams {
  page?: number;
  limit?: number;
  search?: string;
  resource?: string;
  action?: string;
}

class PermissionAPI {
  async getPermissions(params: GetPermissionsParams = {}): Promise<PermissionListResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.resource) queryParams.append('resource', params.resource);
      if (params.action) queryParams.append('action', params.action);

      const response = await api.get(`/permissions?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching permissions:', error);
      throw error;
    }
  }

  async getPermission(id: string): Promise<Permission> {
    try {
      const response = await api.get(`/permissions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching permission:', error);
      throw error;
    }
  }

  async createPermission(data: PermissionFormData): Promise<Permission> {
    try {
      const response = await api.post('/permissions', data);
      return response.data;
    } catch (error) {
      console.error('Error creating permission:', error);
      throw error;
    }
  }

  async updatePermission(id: string, data: PermissionFormData): Promise<Permission> {
    try {
      const response = await api.put(`/permissions/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating permission:', error);
      throw error;
    }
  }

  async deletePermission(id: string): Promise<void> {
    try {
      await api.delete(`/permissions/${id}`);
    } catch (error) {
      console.error('Error deleting permission:', error);
      throw error;
    }
  }

  async getPermissionStats(): Promise<PermissionStats> {
    try {
      const response = await api.get('/permissions/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching permission stats:', error);
      throw error;
    }
  }

  async getResources(): Promise<string[]> {
    try {
      const response = await this.getPermissions({ limit: 1000 });
      const uniqueResources = [...new Set(response.permissions.map(p => p.resource))];
      return uniqueResources.sort();
    } catch (error) {
      console.error('Error fetching resources:', error);
      throw error;
    }
  }

  async getActions(): Promise<string[]> {
    return ['view', 'create', 'update', 'delete'];
  }

  async checkPermissionExists(resource: string, action: string, excludeId?: string): Promise<boolean> {
    try {
      const response = await this.getPermissions({ resource, action, limit: 1000 });
      if (excludeId) {
        return response.permissions.some(p => p._id !== excludeId);
      }
      return response.permissions.length > 0;
    } catch (error) {
      console.error('Error checking permission existence:', error);
      return false;
    }
  }

  generatePermissionName(resource: string, action: string): string {
    return `${resource}_${action}`;
  }

  validatePermissionData(data: PermissionFormData): string[] {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Permission name is required');
    }

    if (!data.resource || data.resource.trim().length === 0) {
      errors.push('Resource is required');
    }

    if (!data.action) {
      errors.push('Action is required');
    }

    if (data.action && !['view', 'create', 'update', 'delete'].includes(data.action)) {
      errors.push('Action must be one of: view, create, update, delete');
    }

    if (data.name && data.resource && data.action) {
      const expectedName = this.generatePermissionName(data.resource, data.action);
      if (data.name !== expectedName) {
        errors.push(`Permission name should be "${expectedName}" for resource "${data.resource}" and action "${data.action}"`);
      }
    }

    return errors;
  }
}

export const permissionAPI = new PermissionAPI();
export default permissionAPI;