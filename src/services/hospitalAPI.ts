// src/services/hospitalAPI.ts - Fixed version with proper FormData handling
import axios from 'axios';
import { handleApiError } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create a separate axios instance for file uploads
const createApiInstance = (contentType = 'application/json') => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // Increased timeout for file uploads
    headers: {
      'Content-Type': contentType,
    },
  });

  // Add auth token interceptor
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return instance;
};

export interface Hospital {
  _id: string;
  name: string;
  email: string;
  phone: string;
  gstNumber: string;
  panNumber: string;
  agreementFile?: {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    uploadedAt: string;
    uploadedBy: string;
  };
  gstAddress: string;
  city: string;
  state: {
    _id: string;
    name: string;
    code: string;
  };
  pincode: string;
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
}

export interface HospitalContact {
  _id: string;
  hospital: {
    _id: string;
    name: string;
  };
  departmentName: string;
  personName: string;
  email: string;
  phone: string;
  address: string;
  location: string;
  pincode: string;
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
}

export interface HospitalFormData {
  name: string;
  email: string;
  phone: string;
  gstNumber: string;
  panNumber: string;
  agreementFile?: string;
  gstAddress: string;
  city: string;
  state: string;
  pincode: string;
  isActive?: boolean;
}

export interface HospitalContactFormData {
  departmentName: string;
  personName: string;
  email: string;
  phone: string;
  address: string;
  location: string;
  pincode: string;
  isActive?: boolean;
}

export const hospitalAPI = {
  // Hospital CRUD operations
  getHospitals: async (params?: { page?: number; limit?: number; search?: string }) => {
    try {
      console.log('Fetching hospitals with params:', params);
      const api = createApiInstance();
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
      const api = createApiInstance();
      const response = await api.get(`/hospitals/${id}`);
      console.log('Hospital API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching hospital:', error);
      throw error;
    }
  },
  
  createHospital: async (data: HospitalFormData | FormData) => {
    try {
      console.log('Creating hospital with data:', data);
      
      // Determine if we're sending FormData (with file) or regular JSON
      const isFormData = data instanceof FormData;
      const api = createApiInstance(isFormData ? 'multipart/form-data' : 'application/json');
      
      // Remove Content-Type header for FormData to let browser set it with boundary
      if (isFormData) {
        delete api.defaults.headers['Content-Type'];
      }
      
      const response = await api.post('/hospitals', data);
      console.log('Create hospital response:', response.data);
      return response;
    } catch (error) {
      console.error('Error creating hospital:', error);
      throw error;
    }
  },
  
  updateHospital: async (id: string, data: HospitalFormData | FormData) => {
    try {
      console.log('Updating hospital:', id, 'with data:', data);
      
      // Determine if we're sending FormData (with file) or regular JSON
      const isFormData = data instanceof FormData;
      const api = createApiInstance(isFormData ? 'multipart/form-data' : 'application/json');
      
      // Remove Content-Type header for FormData to let browser set it with boundary
      if (isFormData) {
        delete api.defaults.headers['Content-Type'];
      }
      
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
      const api = createApiInstance();
      const response = await api.delete(`/hospitals/${id}`);
      console.log('Delete hospital response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting hospital:', error);
      throw error;
    }
  },

  // Delete hospital file specifically
  deleteHospitalFile: async (id: string) => {
    try {
      console.log('Deleting hospital file for ID:', id);
      const api = createApiInstance();
      const response = await api.delete(`/hospitals/${id}/file`);
      console.log('Delete hospital file response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting hospital file:', error);
      throw error;
    }
  },

  // Hospital Contacts CRUD operations
  getHospitalContacts: async (hospitalId: string, params?: { page?: number; limit?: number; search?: string }) => {
    try {
      console.log('Fetching hospital contacts for hospital:', hospitalId, 'with params:', params);
      const api = createApiInstance();
      const response = await api.get(`/hospitals/${hospitalId}/contacts`, { params });
      console.log('Hospital contacts API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching hospital contacts:', error);
      throw error;
    }
  },
  
  createHospitalContact: async (hospitalId: string, data: HospitalContactFormData) => {
    try {
      console.log('Creating hospital contact for hospital:', hospitalId, 'with data:', data);
      const api = createApiInstance();
      const response = await api.post(`/hospitals/${hospitalId}/contacts`, data);
      console.log('Create hospital contact response:', response.data);
      return response;
    } catch (error) {
      console.error('Error creating hospital contact:', error);
      throw error;
    }
  },
  
  updateHospitalContact: async (hospitalId: string, contactId: string, data: HospitalContactFormData) => {
    try {
      console.log('Updating hospital contact:', contactId, 'for hospital:', hospitalId, 'with data:', data);
      const api = createApiInstance();
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
      const api = createApiInstance();
      const response = await api.delete(`/hospitals/${hospitalId}/contacts/${contactId}`);
      console.log('Delete hospital contact response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting hospital contact:', error);
      throw error;
    }
  },
};