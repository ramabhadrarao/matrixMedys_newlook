// src/services/doctorAPI.ts
import api, { handleApiError } from './api';
import { useAuthStore } from '../store/authStore';

export interface Portfolio {
  _id: string;
  name: string;
  description: string;
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

export interface DoctorAttachment {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  fileType: 'license' | 'certificate' | 'degree' | 'cv' | 'other';
  description?: string;
  uploadedAt: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  downloadUrl?: string;
  viewUrl?: string;
}

export interface MonthlyTarget {
  month: 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 
         'july' | 'august' | 'september' | 'october' | 'november' | 'december';
  target: number;
  year?: number;
}

export interface Doctor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  specialization: Portfolio[];
  hospitals: {
    _id: string;
    name: string;
    city: string;
    state: {
      _id: string;
      name: string;
      code: string;
    };
  }[];
  location: string;
  targets: MonthlyTarget[];
  attachments: DoctorAttachment[];
  attachmentsCount?: number;
  currentYearTargets?: MonthlyTarget[];
  annualTarget?: number;
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

export interface DoctorFormData {
  name: string;
  email: string;
  phone: string;
  specialization: string[];
  hospitals: string[];
  location: string;
  targets: MonthlyTarget[];
  isActive?: boolean;
  attachments?: File[];
  fileTypes?: string[];
  descriptions?: string[];
}

export interface AttachmentFormData {
  file: File;
  fileType: 'license' | 'certificate' | 'degree' | 'cv' | 'other';
  description?: string;
}

// Helper function for file uploads with progress
const createFormDataRequest = async (
  url: string, 
  data: DoctorFormData | FormData, 
  method: 'POST' | 'PUT' = 'POST',
  onProgress?: (progress: number) => void
) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = useAuthStore.getState().accessToken;
  
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
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
    
    let requestData: FormData;
    if (data instanceof FormData) {
      requestData = data;
    } else {
      requestData = new FormData();
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          if (key === 'attachments' && Array.isArray(value)) {
            value.forEach((file: File) => {
              requestData.append('attachments', file);
            });
          } else if (key === 'fileTypes' && Array.isArray(value)) {
            value.forEach((type: string) => {
              requestData.append('fileTypes', type);
            });
          } else if (key === 'descriptions' && Array.isArray(value)) {
            value.forEach((desc: string) => {
              requestData.append('descriptions', desc);
            });
          } else if (key === 'specialization' && Array.isArray(value)) {
            // Send each specialization ID separately
            value.forEach((id: string) => {
              requestData.append('specialization', id);
            });
          } else if (key === 'hospitals' && Array.isArray(value)) {
            // Send each hospital ID separately
            value.forEach((id: string) => {
              requestData.append('hospitals', id);
            });
          } else if (key === 'targets' && Array.isArray(value)) {
            // Send targets as JSON string
            requestData.append('targets', JSON.stringify(value));
          } else if (Array.isArray(value)) {
            value.forEach((item: string) => {
              requestData.append(key, item);
            });
          } else {
            requestData.append(key, value.toString());
          }
        }
      });
    }
    
    xhr.send(requestData);
  });
};

// Helper functions for file operations
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

const viewFileWithAuth = (filename: string) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = useAuthStore.getState().accessToken;
  
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
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  })
  .catch(error => {
    console.error('View file error:', error);
    throw error;
  });
};

export const doctorAPI = {
  // Doctor CRUD operations
  getDoctors: async (params?: { page?: number; limit?: number; search?: string; specialization?: string; hospital?: string }) => {
    try {
      console.log('Fetching doctors with params:', params);
      const response = await api.get('/doctors', { params });
      console.log('Doctors API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching doctors:', error);
      throw error;
    }
  },
  
  getDoctor: async (id: string) => {
    try {
      console.log('Fetching doctor with ID:', id);
      const response = await api.get(`/doctors/${id}`);
      console.log('Doctor API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching doctor:', error);
      throw error;
    }
  },
  
  createDoctor: async (data: DoctorFormData, onProgress?: (progress: number) => void) => {
    try {
      console.log('Creating doctor with data:', data);
      
      if (data.attachments && data.attachments.length > 0) {
        return await createFormDataRequest('/doctors', data, 'POST', onProgress);
      } else {
        const { attachments, fileTypes, descriptions, ...doctorData } = data;
        const response = await api.post('/doctors', doctorData);
        console.log('Create doctor response:', response.data);
        return response;
      }
    } catch (error) {
      console.error('Error creating doctor:', error);
      throw error;
    }
  },
  
  updateDoctor: async (id: string, data: DoctorFormData, onProgress?: (progress: number) => void) => {
    try {
      console.log('Updating doctor:', id, 'with data:', data);
      
      if (data.attachments && data.attachments.length > 0) {
        return await createFormDataRequest(`/doctors/${id}`, data, 'PUT', onProgress);
      } else {
        const { attachments, fileTypes, descriptions, ...doctorData } = data;
        const response = await api.put(`/doctors/${id}`, doctorData);
        console.log('Update doctor response:', response.data);
        return response;
      }
    } catch (error) {
      console.error('Error updating doctor:', error);
      throw error;
    }
  },
  
  deleteDoctor: async (id: string) => {
    try {
      console.log('Deleting doctor with ID:', id);
      const response = await api.delete(`/doctors/${id}`);
      console.log('Delete doctor response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting doctor:', error);
      throw error;
    }
  },

  // Attachment management
  addAttachment: async (doctorId: string, attachmentData: AttachmentFormData, onProgress?: (progress: number) => void) => {
    try {
      console.log('Adding attachment to doctor:', doctorId);
      
      const formData = new FormData();
      formData.append('attachment', attachmentData.file);
      formData.append('fileType', attachmentData.fileType);
      if (attachmentData.description) {
        formData.append('description', attachmentData.description);
      }
      
      return await createFormDataRequest(`/doctors/${doctorId}/attachments`, formData, 'POST', onProgress);
    } catch (error) {
      console.error('Error adding attachment:', error);
      throw error;
    }
  },

  deleteAttachment: async (doctorId: string, attachmentId: string) => {
    try {
      console.log('Deleting attachment:', attachmentId, 'for doctor:', doctorId);
      const response = await api.delete(`/doctors/${doctorId}/attachments/${attachmentId}`);
      console.log('Delete attachment response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  },

  // File operations
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
};

// Portfolio API
export const portfolioAPI = {
  getPortfolios: async (params?: { page?: number; limit?: number; search?: string }) => {
    try {
      console.log('Fetching portfolios with params:', params);
      const response = await api.get('/portfolios', { params });
      console.log('Portfolios API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching portfolios:', error);
      throw error;
    }
  },
  
  getPortfolio: async (id: string) => {
    try {
      console.log('Fetching portfolio with ID:', id);
      const response = await api.get(`/portfolios/${id}`);
      console.log('Portfolio API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      throw error;
    }
  },
  
  createPortfolio: async (data: { name: string; description: string }) => {
    try {
      console.log('Creating portfolio with data:', data);
      const response = await api.post('/portfolios', data);
      console.log('Create portfolio response:', response.data);
      return response;
    } catch (error) {
      console.error('Error creating portfolio:', error);
      throw error;
    }
  },
  
  updatePortfolio: async (id: string, data: { name: string; description: string; isActive: boolean }) => {
    try {
      console.log('Updating portfolio:', id, 'with data:', data);
      const response = await api.put(`/portfolios/${id}`, data);
      console.log('Update portfolio response:', response.data);
      return response;
    } catch (error) {
      console.error('Error updating portfolio:', error);
      throw error;
    }
  },
  
  deletePortfolio: async (id: string) => {
    try {
      console.log('Deleting portfolio with ID:', id);
      const response = await api.delete(`/portfolios/${id}`);
      console.log('Delete portfolio response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      throw error;
    }
  },
};