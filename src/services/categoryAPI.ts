import api, { handleApiError } from './api';
import { useAuthStore } from '../store/authStore';

export interface Category {
  _id: string;
  name: string;
  description: string;
  principal: {
    _id: string;
    name: string;
  };
  portfolio: {
    _id: string;
    name: string;
  };
  parent?: {
    _id: string;
    name: string;
  };
  level: number;
  path: string;
  ancestors: Array<{
    _id: string;
    name: string;
  }>;
  hasChildren: boolean;
  childrenCount: number;
  productsCount: number;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  createdBy: {
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
  children?: Category[]; // For tree structure
}

export interface CategoryFormData {
  name: string;
  description?: string;
  principal: string;
  portfolio: string;
  parent?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  description?: string;
  level: number;
  hasChildren: boolean;
  childrenCount: number;
  productsCount: number;
  children: CategoryTreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
  isSelected?: boolean;
}

export const categoryAPI = {
  // Get categories (flat or tree)
  getCategories: async (params?: {
    principal?: string;
    portfolio?: string;
    parent?: string;
    flat?: boolean;
  }) => {
    try {
      console.log('Fetching categories with params:', params);
      const response = await api.get('/categories', { params });
      console.log('Categories API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Get category tree for principal and portfolio
  getCategoryTree: async (principalId: string, portfolioId: string) => {
    try {
      console.log('Fetching category tree for:', principalId, portfolioId);
      const response = await api.get(`/categories/tree/${principalId}/${portfolioId}`);
      console.log('Category tree response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching category tree:', error);
      throw error;
    }
  },

  // Get single category with children
  getCategory: async (id: string) => {
    try {
      console.log('Fetching category with ID:', id);
      const response = await api.get(`/categories/${id}`);
      console.log('Category API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching category:', error);
      throw error;
    }
  },

  // Get products in category
  getCategoryProducts: async (id: string, params?: {
    page?: number;
    limit?: number;
    includeSubcategories?: boolean;
  }) => {
    try {
      console.log('Fetching category products:', id, params);
      const response = await api.get(`/categories/${id}/products`, { params });
      console.log('Category products response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching category products:', error);
      throw error;
    }
  },

  // Create category
  createCategory: async (data: CategoryFormData) => {
    try {
      console.log('Creating category with data:', data);
      const response = await api.post('/categories', data);
      console.log('Create category response:', response.data);
      return response;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  // Update category
  updateCategory: async (id: string, data: CategoryFormData) => {
    try {
      console.log('Updating category:', id, 'with data:', data);
      const response = await api.put(`/categories/${id}`, data);
      console.log('Update category response:', response.data);
      return response;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  // Move category to different parent
  moveCategory: async (id: string, newParentId: string | null) => {
    try {
      console.log('Moving category:', id, 'to parent:', newParentId);
      const response = await api.put(`/categories/${id}/move`, {
        newParentId
      });
      console.log('Move category response:', response.data);
      return response;
    } catch (error) {
      console.error('Error moving category:', error);
      throw error;
    }
  },

  // Delete category
  deleteCategory: async (id: string) => {
    try {
      console.log('Deleting category with ID:', id);
      const response = await api.delete(`/categories/${id}`);
      console.log('Delete category response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },

  // Search categories
  searchCategories: async (query: string, principalId?: string, portfolioId?: string) => {
    try {
      const params = {
        search: query,
        ...(principalId && { principal: principalId }),
        ...(portfolioId && { portfolio: portfolioId }),
        flat: true
      };
      const response = await api.get('/categories', { params });
      return response.data.categories || [];
    } catch (error) {
      console.error('Error searching categories:', error);
      return [];
    }
  }
};