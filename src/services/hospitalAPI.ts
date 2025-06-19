// src/services/hospitalAPI.ts - Updated with proper file handling
import api, { handleApiError } from './api';
import { useAuthStore } from '../store/authStore';

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
  agreementFile?: File;
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

// Helper function for file uploads with progress
const createFormDataRequest = async (
  url: string, 
  data: HospitalFormData | FormData, 
  method: 'POST' | 'PUT' = 'POST',
  onProgress?: (progress: number) => void
) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = useAuthStore.getState().accessToken;
  
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };
    }
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({ data: response });
        } catch (e) {
          resolve({ data: xhr.responseText });
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          const error = new Error(errorData.message || `HTTP ${xhr.status}: ${xhr.statusText}`);
          (error as any).response = { 
            status: xhr.status, 
            data: errorData 
          };
          reject(error);
        } catch (e) {
          const error = new Error(`HTTP ${xhr.status}: ${xhr.statusText}`);
          (error as any).response = { 
            status: xhr.status, 
            data: { message: xhr.statusText } 
          };
          reject(error);
        }
      }
    };
    
    xhr.onerror = () => {
      reject(new Error('Network error occurred'));
    };
    
    xhr.open(method, `${API_BASE_URL}${url}`, true);
    
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    
    // Prepare data
    let requestData: FormData;
    if (data instanceof FormData) {
      requestData = data;
    } else {
      requestData = new FormData();
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          if (key === 'agreementFile' && value instanceof File) {
            requestData.append('agreementFile', value);
          } else {
            requestData.append(key, value.toString());
          }
        }
      });
    }
    
    xhr.send(requestData);
  });
};

// Helper function for authenticated file downloads
const downloadFileWithAuth = async (filename: string, originalName?: string) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = useAuthStore.getState().accessToken;
    
    const response = await fetch(`${API_BASE_URL}/files/download/${filename}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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

// Helper function for authenticated file viewing
const viewFileWithAuth = (filename: string) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = useAuthStore.getState().accessToken;
  
  // Create a temporary form to POST the request with auth header
  const form = document.createElement('form');
  form.method = 'GET';
  form.target = '_blank';
  form.action = `${API_BASE_URL}/files/view/${filename}`;
  
  // Add authorization as a header (we'll use a different approach)
  // Since we can't add custom headers to a form submission, we'll use fetch with blob
  
  fetch(`${API_BASE_URL}/files/view/${filename}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
  })
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Clean up the URL after a delay to ensure the file opens
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  })
  .catch(error => {
    console.error('View file error:', error);
    throw error;
  });
};

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
  
  createHospital: async (data: HospitalFormData, onProgress?: (progress: number) => void) => {
    try {
      console.log('Creating hospital with data:', data);
      
      // Check if there's a file to upload
      if (data.agreementFile instanceof File) {
        return await createFormDataRequest('/hospitals', data, 'POST', onProgress);
      } else {
        // No file, use regular API
        const { agreementFile, ...hospitalData } = data;
        const response = await api.post('/hospitals', hospitalData);
        console.log('Create hospital response:', response.data);
        return response;
      }
    } catch (error) {
      console.error('Error creating hospital:', error);
      throw error;
    }
  },
  
  updateHospital: async (id: string, data: HospitalFormData, onProgress?: (progress: number) => void) => {
    try {
      console.log('Updating hospital:', id, 'with data:', data);
      
      // Check if there's a file to upload
      if (data.agreementFile instanceof File) {
        return await createFormDataRequest(`/hospitals/${id}`, data, 'PUT', onProgress);
      } else {
        // No file, use regular API
        const { agreementFile, ...hospitalData } = data;
        const response = await api.put(`/hospitals/${id}`, hospitalData);
        console.log('Update hospital response:', response.data);
        return response;
      }
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

  // Delete hospital agreement file
  deleteHospitalFile: async (id: string) => {
    try {
      console.log('Deleting hospital file for ID:', id);
      const response = await api.delete(`/hospitals/${id}/file`);
      console.log('Delete hospital file response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting hospital file:', error);
      throw error;
    }
  },

  // File operations - Updated with proper authentication
  viewFile: (filename: string) => {
    try {
      viewFileWithAuth(filename);
    } catch (error) {
      console.error('Error viewing file:', error);
      handleApiError(error);
    }
  },

  downloadFile: async (filename: string, originalName?: string) => {
    try {
      await downloadFileWithAuth(filename, originalName);
    } catch (error) {
      console.error('Error downloading file:', error);
      handleApiError(error);
    }
  },

  // Get file URL with token (for cases where you need the URL)
  getFileUrl: (filename: string, type: 'view' | 'download' = 'view') => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${API_BASE_URL}/files/${type}/${filename}`;
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
  
  createHospitalContact: async (hospitalId: string, data: HospitalContactFormData) => {
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
  
  updateHospitalContact: async (hospitalId: string, contactId: string, data: HospitalContactFormData) => {
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