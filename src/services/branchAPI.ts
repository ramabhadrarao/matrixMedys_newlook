// src/services/branchAPI.ts
import api, { handleApiError } from './api';
import { useAuthStore } from '../store/authStore';

export interface BranchDocument {
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

export interface Branch {
  _id: string;
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  branchCode?: string;
  drugLicenseNumber: string;
  gstNumber: string;
  panNumber: string;
  gstAddress: string;
  city: string;
  state: {
    _id: string;
    name: string;
    code: string;
  };
  pincode: string;
  remarks?: string;
  documents: BranchDocument[];
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

export interface BranchContact {
  _id: string;
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

export interface BranchFormData {
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  branchCode?: string;
  drugLicenseNumber: string;
  gstNumber: string;
  panNumber: string;
  gstAddress: string;
  city: string;
  state: string;
  pincode: string;
  remarks?: string;
  isActive?: boolean;
  documents?: File[];
  documentNames?: string[];
  validityStartDates?: string[];
  validityEndDates?: string[];
}

export interface BranchContactFormData {
  contactPersonName: string;
  department: 'Admin' | 'Operations' | 'Sales' | 'Logistics';
  designation: string;
  contactNumber: string;
  alternateContactPerson?: string;
  emailAddress: string;
  isActive?: boolean;
}

export interface BranchDocumentFormData {
  file: File;
  documentName: string;
  validityStartDate: string;
  validityEndDate: string;
}

// Helper function to create FormData for requests with file uploads
const createFormDataRequest = async (
  url: string, 
  data: BranchFormData | FormData, 
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

  const { getToken } = useAuthStore.getState();
  const token = getToken();

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
    const { getToken } = useAuthStore.getState();
    const token = getToken();
    
    const response = await fetch(`${api.defaults.baseURL}/api/files/download/${filename}`, {
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
    const { getToken } = useAuthStore.getState();
    const token = getToken();
    
    const url = `${api.defaults.baseURL}/api/files/view/${filename}?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  } catch (error) {
    console.error('View error:', error);
    throw error;
  }
};

export const branchAPI = {
  // Get all branches with pagination and search
  getBranches: async (params?: { page?: number; limit?: number; search?: string }) => {
    try {
      const response = await api.get('/branches', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get single branch by ID
  getBranch: async (id: string) => {
    try {
      const response = await api.get(`/branches/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Create new branch
  createBranch: async (data: BranchFormData, onProgress?: (progress: number) => void) => {
    try {
      const response = await createFormDataRequest('/branches', data, 'POST', onProgress);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Update existing branch
  updateBranch: async (id: string, data: BranchFormData, onProgress?: (progress: number) => void) => {
    try {
      const response = await createFormDataRequest(`/branches/${id}`, data, 'PUT', onProgress);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Delete branch
  deleteBranch: async (id: string) => {
    try {
      const response = await api.delete(`/branches/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Document management
  addDocument: async (branchId: string, documentData: BranchDocumentFormData, onProgress?: (progress: number) => void) => {
    try {
      const formData = new FormData();
      formData.append('file', documentData.file);
      formData.append('documentName', documentData.documentName);
      formData.append('validityStartDate', documentData.validityStartDate);
      formData.append('validityEndDate', documentData.validityEndDate);
      
      const response = await createFormDataRequest(`/branches/${branchId}/documents`, formData, 'POST', onProgress);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateDocument: async (branchId: string, documentId: string, data: { documentName?: string; validityStartDate?: string; validityEndDate?: string }) => {
    try {
      const response = await api.put(`/branches/${branchId}/documents/${documentId}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteDocument: async (branchId: string, documentId: string) => {
    try {
      const response = await api.delete(`/branches/${branchId}/documents/${documentId}`);
      return response.data;
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
  getBranchContacts: async (branchId: string, params?: { page?: number; limit?: number; search?: string }) => {
    try {
      const response = await api.get(`/branches/${branchId}/contacts`, { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  createBranchContact: async (branchId: string, data: BranchContactFormData) => {
    try {
      const response = await api.post(`/branches/${branchId}/contacts`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateBranchContact: async (branchId: string, contactId: string, data: BranchContactFormData) => {
    try {
      const response = await api.put(`/branches/${branchId}/contacts/${contactId}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteBranchContact: async (branchId: string, contactId: string) => {
    try {
      const response = await api.delete(`/branches/${branchId}/contacts/${contactId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};