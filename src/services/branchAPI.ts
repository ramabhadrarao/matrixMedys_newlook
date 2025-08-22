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
  name: string;  // This should be the contact name
  contactPersonName: string;  // Alternative field name
  department: 'Admin' | 'Operations' | 'Sales' | 'Logistics';
  designation: string;
  phone: string;  // This should be the phone
  contactNumber: string;  // Alternative field name
  alternatePhone?: string;
  alternateContactPerson?: string;
  email: string;  // This should be the email
  emailAddress: string;  // Alternative field name
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
  name: string;
  contactPersonName?: string;
  department: 'Admin' | 'Operations' | 'Sales' | 'Logistics';
  designation: string;
  phone: string;
  contactNumber?: string;
  alternatePhone?: string;
  alternateContactPerson?: string;
  email: string;
  emailAddress?: string;
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

export const branchAPI = {
  // Get all branches with pagination and search
  getBranches: async (params?: { page?: number; limit?: number; search?: string }) => {
    try {
      const response = await api.get('/branches', { params });
      console.log('Branch API Response:', response.data); // Debug log
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching branches:', error);
      throw handleApiError(error);
    }
  },

  // Get single branch by ID
  getBranch: async (id: string) => {
    try {
      const response = await api.get(`/branches/${id}`);
      console.log('Single Branch API Response:', response.data); // Debug log
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching branch:', error);
      throw handleApiError(error);
    }
  },

  // Create new branch
  createBranch: async (data: BranchFormData, onProgress?: (progress: number) => void) => {
    try {
      const response = await createFormDataRequest('/branches', data, 'POST', onProgress);
      return { data: response };
    } catch (error) {
      console.error('Error creating branch:', error);
      throw handleApiError(error);
    }
  },

  // Update existing branch
  updateBranch: async (id: string, data: BranchFormData, onProgress?: (progress: number) => void) => {
    try {
      const response = await createFormDataRequest(`/branches/${id}`, data, 'PUT', onProgress);
      return { data: response };
    } catch (error) {
      console.error('Error updating branch:', error);
      throw handleApiError(error);
    }
  },

  // Delete branch
  deleteBranch: async (id: string) => {
    try {
      const response = await api.delete(`/branches/${id}`);
      return { data: response.data };
    } catch (error) {
      console.error('Error deleting branch:', error);
      throw handleApiError(error);
    }
  },

  // Document management
  addDocument: async (branchId: string, documentData: FormData, onProgress?: (progress: number) => void) => {
    try {
      const response = await createFormDataRequest(`/branches/${branchId}/documents`, documentData, 'POST', onProgress);
      return { data: response };
    } catch (error) {
      console.error('Error adding document:', error);
      throw handleApiError(error);
    }
  },

  updateDocument: async (branchId: string, documentId: string, data: { documentName?: string; validityStartDate?: string; validityEndDate?: string }) => {
    try {
      const response = await api.put(`/branches/${branchId}/documents/${documentId}`, data);
      return { data: response.data };
    } catch (error) {
      console.error('Error updating document:', error);
      throw handleApiError(error);
    }
  },

  deleteDocument: async (branchId: string, documentId: string) => {
    try {
      const response = await api.delete(`/branches/${branchId}/documents/${documentId}`);
      return { data: response.data };
    } catch (error) {
      console.error('Error deleting document:', error);
      throw handleApiError(error);
    }
  },

  // File operations
  viewFile: (filename: string) => {
    try {
      viewFileWithAuth(filename);
    } catch (error) {
      console.error('Error viewing file:', error);
      throw handleApiError(error);
    }
  },

  downloadFile: async (filename: string, originalName?: string) => {
    try {
      await downloadFileWithAuth(filename, originalName);
    } catch (error) {
      console.error('Error downloading file:', error);
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
      console.log('Branch Contacts API Response:', response.data); // Debug log
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching branch contacts:', error);
      throw handleApiError(error);
    }
  },

  createBranchContact: async (branchId: string, data: BranchContactFormData) => {
    try {
      // Map the form data to the backend expected format
      const contactData = {
        contactPersonName: data.name || data.contactPersonName,
        department: data.department,
        designation: data.designation,
        contactNumber: data.phone || data.contactNumber,
        alternateContactPerson: data.alternatePhone || data.alternateContactPerson,
        emailAddress: data.email || data.emailAddress,
        isActive: data.isActive
      };
      
      const response = await api.post(`/branches/${branchId}/contacts`, contactData);
      return { data: response.data };
    } catch (error) {
      console.error('Error creating branch contact:', error);
      throw handleApiError(error);
    }
  },

  updateBranchContact: async (branchId: string, contactId: string, data: BranchContactFormData) => {
    try {
      // Map the form data to the backend expected format
      const contactData = {
        contactPersonName: data.name || data.contactPersonName,
        department: data.department,
        designation: data.designation,
        contactNumber: data.phone || data.contactNumber,
        alternateContactPerson: data.alternatePhone || data.alternateContactPerson,
        emailAddress: data.email || data.emailAddress,
        isActive: data.isActive
      };
      
      const response = await api.put(`/branches/${branchId}/contacts/${contactId}`, contactData);
      return { data: response.data };
    } catch (error) {
      console.error('Error updating branch contact:', error);
      throw handleApiError(error);
    }
  },

  deleteBranchContact: async (branchId: string, contactId: string) => {
    try {
      const response = await api.delete(`/branches/${branchId}/contacts/${contactId}`);
      return { data: response.data };
    } catch (error) {
      console.error('Error deleting branch contact:', error);
      throw handleApiError(error);
    }
  },
};