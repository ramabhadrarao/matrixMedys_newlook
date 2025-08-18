// src/services/api.ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug log for POST/PUT requests
    if (process.env.NODE_ENV === 'development') {
      if (config.method === 'post' || config.method === 'put') {
        console.log(`API ${config.method?.toUpperCase()} Request:`, {
          url: config.url,
          data: config.data,
          headers: config.headers
        });
      }
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          useAuthStore.getState().setTokens(accessToken, refreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Enhanced error handler
export const handleApiError = (error: any) => {
  console.error('API Error Details:', {
    message: error.message,
    response: error.response?.data,
    status: error.response?.status,
    config: {
      url: error.config?.url,
      method: error.config?.method,
      params: error.config?.params,
    }
  });

  let message = 'An unexpected error occurred';

  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        message = data.message || 'Invalid request';
        break;
      case 401:
        message = 'Authentication required';
        break;
      case 403:
        message = data.message || 'Access denied. You don\'t have permission to perform this action';
        break;
      case 404:
        message = 'Resource not found';
        break;
      case 422:
        message = data.message || 'Validation failed';
        if (data.errors && Array.isArray(data.errors)) {
          message = data.errors.map((err: any) => err.msg).join(', ');
        }
        break;
      case 500:
        message = 'Server error. Please try again later';
        break;
      default:
        message = data.message || `Server error (${status})`;
    }
  } else if (error.request) {
    // Network error
    message = 'Network error. Please check your connection and try again';
  } else {
    // Other error
    message = error.message || 'An unexpected error occurred';
  }

  toast.error(message);
  return message;
};

// Auth API
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  logout: () => api.post('/auth/logout'),
  
  forgotPassword: (data: { email: string }) =>
    api.post('/auth/forgot-password', data),
  
  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
  
  getProfile: () => api.get('/auth/profile'),
};

// States API
export const statesAPI = {
  getStates: async (params?: { page?: number; limit?: number; search?: string }) => {
    try {
      console.log('Fetching states with params:', params);
      const response = await api.get('/states', { params });
      console.log('States API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching states:', error);
      throw error;
    }
  },
  
  getState: async (id: string) => {
    try {
      console.log('Fetching state with ID:', id);
      const response = await api.get(`/states/${id}`);
      console.log('State API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching state:', error);
      throw error;
    }
  },
  
  createState: async (data: any) => {
    try {
      console.log('Creating state with data:', data);
      const response = await api.post('/states', data);
      console.log('Create state response:', response.data);
      return response;
    } catch (error) {
      console.error('Error creating state:', error);
      throw error;
    }
  },
  
  updateState: async (id: string, data: any) => {
    try {
      console.log('Updating state:', id, 'with data:', data);
      const response = await api.put(`/states/${id}`, data);
      console.log('Update state response:', response.data);
      return response;
    } catch (error) {
      console.error('Error updating state:', error);
      throw error;
    }
  },
  
  deleteState: async (id: string) => {
    try {
      console.log('Deleting state with ID:', id);
      const response = await api.delete(`/states/${id}`);
      console.log('Delete state response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting state:', error);
      throw error;
    }
  },
};

// Users API
export const usersAPI = {
  getUsers: async (params?: { page?: number; limit?: number; search?: string }) => {
    try {
      console.log('Fetching users with params:', params);
      const response = await api.get('/users', { params });
      console.log('Users API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },
  
  getUser: async (id: string) => {
    try {
      console.log('Fetching user with ID:', id);
      const response = await api.get(`/users/${id}`);
      console.log('User API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },
  
  createUser: async (data: any) => {
    try {
      console.log('Creating user with data:', data);
      const response = await api.post('/users', data);
      console.log('Create user response:', response.data);
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },
  
  updateUser: async (id: string, data: any) => {
    try {
      console.log('Updating user:', id, 'with data:', data);
      const response = await api.put(`/users/${id}`, data);
      console.log('Update user response:', response.data);
      return response;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },
  
  deleteUser: async (id: string) => {
    try {
      console.log('Deleting user with ID:', id);
      const response = await api.delete(`/users/${id}`);
      console.log('Delete user response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },
  
  getUserPermissions: async (id: string) => {
    try {
      console.log('Fetching user permissions for ID:', id);
      const response = await api.get(`/users/${id}/permissions`);
      console.log('User permissions response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      throw error;
    }
  },
  
  updateUserPermissions: async (id: string, data: { permissions: string[] }) => {
    try {
      console.log('Updating user permissions:', id, 'with data:', data);
      const response = await api.put(`/users/${id}/permissions`, data);
      console.log('Update user permissions response:', response.data);
      return response;
    } catch (error) {
      console.error('Error updating user permissions:', error);
      throw error;
    }
  },
};

// Permissions API
export const permissionsAPI = {
  getPermissions: async () => {
    try {
      console.log('Fetching all permissions');
      const response = await api.get('/permissions');
      console.log('Permissions API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching permissions:', error);
      throw error;
    }
  },
  
  getPermission: async (id: string) => {
    try {
      console.log('Fetching permission with ID:', id);
      const response = await api.get(`/permissions/${id}`);
      console.log('Permission API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching permission:', error);
      throw error;
    }
  },
  
  createPermission: async (data: any) => {
    try {
      console.log('Creating permission with data:', data);
      const response = await api.post('/permissions', data);
      console.log('Create permission response:', response.data);
      return response;
    } catch (error) {
      console.error('Error creating permission:', error);
      throw error;
    }
  },
  
  updatePermission: async (id: string, data: any) => {
    try {
      console.log('Updating permission:', id, 'with data:', data);
      const response = await api.put(`/permissions/${id}`, data);
      console.log('Update permission response:', response.data);
      return response;
    } catch (error) {
      console.error('Error updating permission:', error);
      throw error;
    }
  },
  
  deletePermission: async (id: string) => {
    try {
      console.log('Deleting permission with ID:', id);
      const response = await api.delete(`/permissions/${id}`);
      console.log('Delete permission response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting permission:', error);
      throw error;
    }
  },
};

// Hospital API
export const hospitalAPI = {
  // Hospital CRUD operations
  getHospitals: async (params?: { page?: number; limit?: number; search?: string }) => {
    try {
      console.log('Fetching hospitals with params:', params);
      const response = await api.get('/hospitals', { params });
      console.log('Hospitals API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      throw error;
    }
  },
  
  getHospital: async (id: string) => {
    try {
      console.log('Fetching hospital with ID:', id);
      const response = await api.get(`/hospitals/${id}`);
      console.log('Hospital API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching hospital:', error);
      throw error;
    }
  },
  
  createHospital: async (data: any) => {
    try {
      console.log('Creating hospital with data:', data);
      const response = await api.post('/hospitals', data);
      console.log('Create hospital response:', response.data);
      return response;
    } catch (error) {
      console.error('Error creating hospital:', error);
      throw error;
    }
  },
  
  updateHospital: async (id: string, data: any) => {
    try {
      console.log('Updating hospital:', id, 'with data:', data);
      const response = await api.put(`/hospitals/${id}`, data);
      console.log('Update hospital response:', response.data);
      return response;
    } catch (error) {
      console.error('Error updating hospital:', error);
      throw error;
    }
  },
  
  deleteHospital: async (id: string) => {
    try {
      console.log('Deleting hospital with ID:', id);
      const response = await api.delete(`/hospitals/${id}`);
      console.log('Delete hospital response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting hospital:', error);
      throw error;
    }
  },

  // Hospital Contacts CRUD operations
  getHospitalContacts: async (hospitalId: string, params?: { page?: number; limit?: number; search?: string }) => {
    try {
      console.log('Fetching hospital contacts for hospital:', hospitalId, 'with params:', params);
      const response = await api.get(`/hospitals/${hospitalId}/contacts`, { params });
      console.log('Hospital contacts API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching hospital contacts:', error);
      throw error;
    }
  },
  
  createHospitalContact: async (hospitalId: string, data: any) => {
    try {
      console.log('Creating hospital contact for hospital:', hospitalId, 'with data:', data);
      const response = await api.post(`/hospitals/${hospitalId}/contacts`, data);
      console.log('Create hospital contact response:', response.data);
      return response;
    } catch (error) {
      console.error('Error creating hospital contact:', error);
      throw error;
    }
  },
  
  updateHospitalContact: async (hospitalId: string, contactId: string, data: any) => {
    try {
      console.log('Updating hospital contact:', contactId, 'for hospital:', hospitalId, 'with data:', data);
      const response = await api.put(`/hospitals/${hospitalId}/contacts/${contactId}`, data);
      console.log('Update hospital contact response:', response.data);
      return response;
    } catch (error) {
      console.error('Error updating hospital contact:', error);
      throw error;
    }
  },
  
  deleteHospitalContact: async (hospitalId: string, contactId: string) => {
    try {
      console.log('Deleting hospital contact:', contactId, 'for hospital:', hospitalId);
      const response = await api.delete(`/hospitals/${hospitalId}/contacts/${contactId}`);
      console.log('Delete hospital contact response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting hospital contact:', error);
      throw error;
    }
  },
};

// Dashboard API
export const dashboardAPI = {
  // Get dashboard statistics based on user permissions
  getDashboardStats: async () => {
    try {
      console.log('Fetching dashboard statistics...');
      const response = await api.get('/dashboard/stats');
      console.log('Dashboard stats response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // Get recent activity based on user permissions
  getRecentActivity: async (limit = 10) => {
    try {
      console.log('Fetching recent activity...');
      const response = await api.get('/dashboard/activity', {
        params: { limit }
      });
      console.log('Recent activity response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }
  }
};

// Helper function to check if API is reachable
export const checkApiHealth = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

export default api;