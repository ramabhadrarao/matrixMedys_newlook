// src/services/warehouseAPI.ts
import api, { handleApiError } from './api';
import { useAuthStore } from '../store/authStore';

export interface WarehouseDocument {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  documentName: string;
  validityStartDate: string;
  validityEndDate: string;
  uploadedAt: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  downloadUrl?: string;
  viewUrl?: string;
}

export interface Warehouse {
  _id: string;
  branch: {
    _id: string;
    name: string;
    branchCode?: string;
  };
  name: string;
  warehouseCode?: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  drugLicenseNumber: string;
  district: string;
  state: {
    _id: string;
    name: string;
    code: string;
  };
  pincode: string;
  status: 'Active' | 'Inactive';
  remarks?: string;
  documents: WarehouseDocument[];
  documentsCount?: number;
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

export interface WarehouseContact {
  _id: string;
  warehouse: {
    _id: string;
    name: string;
  };
  branch: {
    _id: string;
    name: string;
  };
  contactPersonName: string;
  department: 'Admin' | 'Operations' | 'Sales' | 'Logistics';
  designation: string;
  contactNumber: string;
  alternateContactPerson?: string;
  emailAddress: string;
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

export interface WarehouseFormData {
  branch: string;
  name: string;
  warehouseCode?: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  drugLicenseNumber: string;
  district: string;
  state: string;
  pincode: string;
  status?: 'Active' | 'Inactive';
  remarks?: string;
  isActive?: boolean;
  documents?: File[];
  documentNames?: string[];
  validityStartDates?: string[];
  validityEndDates?: string[];
}

export interface WarehouseContactFormData {
  contactPersonName: string;
  department: 'Admin' | 'Operations' | 'Sales' | 'Logistics';
  designation: string;
  contactNumber: string;
  alternateContactPerson?: string;
  emailAddress: string;
  isActive?: boolean;
}

export interface WarehouseDocumentFormData {
  file: File;
  documentName: string;
  validityStartDate: string;
  validityEndDate: string;
}

// Helper function to create FormData for requests with file uploads
const createFormDataRequest = async (
  url: string, 
  data: WarehouseFormData | FormData, 
  method: 'POST' | 'PUT' = 'POST',
  onProgress?: (progress: number) => void
) => {
  const formData = data instanceof FormData ? data : new FormData();
  
  if (!(data instanceof FormData)) {
    // Add all non-file fields
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'documents') return; // Handle files separately
      if (key === 'documentNames' || key === 'validityStartDates' || key === 'validityEndDates') {
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            formData.append(`${key}[${index}]`, item);
          });
        }
        return;
      }
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    // Add files
    if (data.documents && data.documents.length > 0) {
      data.documents.forEach((file, index) => {
        formData.append('documents', file);
      });
    }
  }

  const token = useAuthStore.getState().accessToken;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid JSON response'));
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          reject(new Error(errorResponse.message || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });

    xhr.open(method, `${api.defaults.baseURL}${url}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
};

// Helper function to download files with authentication
const downloadFileWithAuth = async (filename: string, originalName?: string) => {
  try {
    const token = useAuthStore.getState().accessToken;
    
    const response = await fetch(`${api.defaults.baseURL}/files/download/${filename}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = originalName || filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

// Helper function to view files with authentication
const viewFileWithAuth = (filename: string) => {
  try {
    const token = useAuthStore.getState().accessToken;
    
    const url = `${api.defaults.baseURL}/files/view/${filename}?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  } catch (error) {
    console.error('View error:', error);
    throw error;
  }
};

export const warehouseAPI = {
  // Get all warehouses with pagination and search
  getWarehouses: async (params?: { page?: number; limit?: number; search?: string; branch?: string }) => {
    try {
      const response = await api.get('/warehouses', { params });
      return { data: response.data };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get single warehouse by ID
  getWarehouse: async (id: string) => {
    try {
      const response = await api.get(`/warehouses/${id}`);
      return { data: response.data };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get warehouses by branch
  getWarehousesByBranch: async (branchId: string, params?: { page?: number; limit?: number; search?: string }) => {
    try {
      const response = await api.get(`/warehouses/branch/${branchId}`, { params });
      return { data: response.data };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Create new warehouse
  createWarehouse: async (data: WarehouseFormData, onProgress?: (progress: number) => void) => {
    try {
      const response = await createFormDataRequest('/warehouses', data, 'POST', onProgress);
      return { data: response };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Update existing warehouse
  updateWarehouse: async (id: string, data: WarehouseFormData, onProgress?: (progress: number) => void) => {
    try {
      const response = await createFormDataRequest(`/warehouses/${id}`, data, 'PUT', onProgress);
      return { data: response };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Delete warehouse
  deleteWarehouse: async (id: string) => {
    try {
      const response = await api.delete(`/warehouses/${id}`);
      return { data: response.data };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Document management
  addDocument: async (warehouseId: string, documentData: WarehouseDocumentFormData, onProgress?: (progress: number) => void) => {
    try {
      const formData = new FormData();
      formData.append('document', documentData.file);
      formData.append('documentName', documentData.documentName);
      formData.append('validityStartDate', documentData.validityStartDate);
      formData.append('validityEndDate', documentData.validityEndDate);
      
      const response = await createFormDataRequest(`/warehouses/${warehouseId}/documents`, formData, 'POST', onProgress);
      return { data: response };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateDocument: async (warehouseId: string, documentId: string, data: { documentName?: string; validityStartDate?: string; validityEndDate?: string }) => {
    try {
      const response = await api.put(`/warehouses/${warehouseId}/documents/${documentId}`, data);
      return { data: response.data };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteDocument: async (warehouseId: string, documentId: string) => {
    try {
      const response = await api.delete(`/warehouses/${warehouseId}/documents/${documentId}`);
      return { data: response.data };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // File operations
  viewFile: (filename: string) => {
    try {
      viewFileWithAuth(filename);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  downloadFile: async (filename: string, originalName?: string) => {
    try {
      await downloadFileWithAuth(filename, originalName);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get file URL for display
  getFileUrl: (filename: string, type: 'view' | 'download' = 'view') => {
    return `${api.defaults.baseURL}/files/${type}/${filename}`;
  },

  // Contact management
  getWarehouseContacts: async (warehouseId: string, params?: { page?: number; limit?: number; search?: string }) => {
    try {
      const response = await api.get(`/warehouses/${warehouseId}/contacts`, { params });
      return { data: response.data };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  createWarehouseContact: async (warehouseId: string, data: WarehouseContactFormData) => {
    try {
      const response = await api.post(`/warehouses/${warehouseId}/contacts`, data);
      return { data: response.data };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateWarehouseContact: async (warehouseId: string, contactId: string, data: WarehouseContactFormData) => {
    try {
      const response = await api.put(`/warehouses/${warehouseId}/contacts/${contactId}`, data);
      return { data: response.data };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteWarehouseContact: async (warehouseId: string, contactId: string) => {
    try {
      const response = await api.delete(`/warehouses/${warehouseId}/contacts/${contactId}`);
      return { data: response.data };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};