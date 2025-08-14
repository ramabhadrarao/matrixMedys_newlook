// src/services/principalAPI.ts
import api, { handleApiError } from './api';
import { useAuthStore } from '../store/authStore';

export interface Portfolio {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface PrincipalAddress {
  _id: string;
  title: string;
  city: string;
  state: {
    _id: string;
    name: string;
    code: string;
  };
  pincode: string;
}

export interface PrincipalDocument {
  _id: string;
  name: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  hasValidity: boolean;
  startDate?: string;
  endDate?: string;
  uploadedAt: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  downloadUrl?: string;
  viewUrl?: string;
}

export interface ContactPerson {
  _id: string;
  portfolio?: {
    _id: string;
    name: string;
  };
  departmentName: string;
  personName: string;
  email: string;
  mobile: string;
  address?: string;
  location: string;
  pincode: string;
}

export interface Principal {
  _id: string;
  name: string;
  portfolio: Portfolio[];
  gstNumber: string;
  panNumber: string;
  email: string;
  mobile: string;
  addresses: PrincipalAddress[];
  documents: PrincipalDocument[];
  contactPersons: ContactPerson[];
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

export interface PrincipalFormData {
  name: string;
  portfolio: string[];
  gstNumber: string;
  panNumber: string;
  email: string;
  mobile: string;
  addresses?: {
    title: string;
    city: string;
    state: string;
    pincode: string;
  }[];
  isActive?: boolean;
  documents?: File[];
  documentNames?: string[];
  hasValidities?: boolean[];
  startDates?: string[];
  endDates?: string[];
}

export interface AddressFormData {
  title: string;
  city: string;
  state: string;
  pincode: string;
}

export interface DocumentFormData {
  file: File;
  name: string;
  hasValidity: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ContactPersonFormData {
  portfolio?: string;
  departmentName: string;
  personName: string;
  email: string;
  mobile: string;
  address?: string;
  location: string;
  pincode: string;
}

// Helper function for file uploads with progress
const createFormDataRequest = async (
  url: string, 
  data: PrincipalFormData | FormData, 
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
          if (key === 'documents' && Array.isArray(value)) {
            value.forEach((file: File) => {
              requestData.append('documents', file);
            });
          } else if (key === 'documentNames' && Array.isArray(value)) {
            value.forEach((name: string) => {
              requestData.append('documentNames', name);
            });
          } else if (key === 'hasValidities' && Array.isArray(value)) {
            value.forEach((hasValidity: boolean) => {
              requestData.append('hasValidities', hasValidity.toString());
            });
          } else if (key === 'startDates' && Array.isArray(value)) {
            value.forEach((date: string) => {
              requestData.append('startDates', date);
            });
          } else if (key === 'endDates' && Array.isArray(value)) {
            value.forEach((date: string) => {
              requestData.append('endDates', date);
            });
          } else if (key === 'portfolio' && Array.isArray(value)) {
            value.forEach((id: string) => {
              requestData.append('portfolio', id);
            });
          } else if (key === 'addresses' && Array.isArray(value)) {
            requestData.append('addresses', JSON.stringify(value));
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

export const principalAPI = {
  // Principal CRUD operations
  getPrincipals: async (params?: { page?: number; limit?: number; search?: string; portfolio?: string }) => {
    try {
      console.log('Fetching principals with params:', params);
      const response = await api.get('/principals', { params });
      console.log('Principals API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching principals:', error);
      throw error;
    }
  },
  
  getPrincipal: async (id: string) => {
    try {
      console.log('Fetching principal with ID:', id);
      const response = await api.get(`/principals/${id}`);
      console.log('Principal API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching principal:', error);
      throw error;
    }
  },
  
  createPrincipal: async (data: PrincipalFormData, onProgress?: (progress: number) => void) => {
    try {
      console.log('Creating principal with data:', data);
      
      if (data.documents && data.documents.length > 0) {
        return await createFormDataRequest('/principals', data, 'POST', onProgress);
      } else {
        const { documents, documentNames, hasValidities, startDates, endDates, ...principalData } = data;
        const response = await api.post('/principals', principalData);
        console.log('Create principal response:', response.data);
        return response;
      }
    } catch (error) {
      console.error('Error creating principal:', error);
      throw error;
    }
  },
  
  updatePrincipal: async (id: string, data: PrincipalFormData, onProgress?: (progress: number) => void) => {
    try {
      console.log('Updating principal:', id, 'with data:', data);
      
      if (data.documents && data.documents.length > 0) {
        return await createFormDataRequest(`/principals/${id}`, data, 'PUT', onProgress);
      } else {
        const { documents, documentNames, hasValidities, startDates, endDates, ...principalData } = data;
        const response = await api.put(`/principals/${id}`, principalData);
        console.log('Update principal response:', response.data);
        return response;
      }
    } catch (error) {
      console.error('Error updating principal:', error);
      throw error;
    }
  },
  
  deletePrincipal: async (id: string) => {
    try {
      console.log('Deleting principal with ID:', id);
      const response = await api.delete(`/principals/${id}`);
      console.log('Delete principal response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting principal:', error);
      throw error;
    }
  },

  // Address management
  addAddress: async (principalId: string, addressData: AddressFormData) => {
    try {
      console.log('Adding address to principal:', principalId);
      const response = await api.post(`/principals/${principalId}/addresses`, addressData);
      console.log('Add address response:', response.data);
      return response;
    } catch (error) {
      console.error('Error adding address:', error);
      throw error;
    }
  },

  updateAddress: async (principalId: string, addressId: string, addressData: AddressFormData) => {
    try {
      console.log('Updating address:', addressId, 'for principal:', principalId);
      const response = await api.put(`/principals/${principalId}/addresses/${addressId}`, addressData);
      console.log('Update address response:', response.data);
      return response;
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  },

  deleteAddress: async (principalId: string, addressId: string) => {
    try {
      console.log('Deleting address:', addressId, 'for principal:', principalId);
      const response = await api.delete(`/principals/${principalId}/addresses/${addressId}`);
      console.log('Delete address response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  },

  // Document management
  addDocument: async (principalId: string, documentData: DocumentFormData, onProgress?: (progress: number) => void) => {
    try {
      console.log('Adding document to principal:', principalId);
      
      const formData = new FormData();
      formData.append('document', documentData.file);
      formData.append('name', documentData.name);
      formData.append('hasValidity', documentData.hasValidity.toString());
      if (documentData.startDate) {
        formData.append('startDate', documentData.startDate);
      }
      if (documentData.endDate) {
        formData.append('endDate', documentData.endDate);
      }
      
      return await createFormDataRequest(`/principals/${principalId}/documents`, formData, 'POST', onProgress);
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  },

  updateDocument: async (principalId: string, documentId: string, data: { name?: string; hasValidity?: boolean; startDate?: string; endDate?: string }) => {
    try {
      console.log('Updating document:', documentId, 'for principal:', principalId);
      const response = await api.put(`/principals/${principalId}/documents/${documentId}`, data);
      console.log('Update document response:', response.data);
      return response;
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  },

  deleteDocument: async (principalId: string, documentId: string) => {
    try {
      console.log('Deleting document:', documentId, 'for principal:', principalId);
      const response = await api.delete(`/principals/${principalId}/documents/${documentId}`);
      console.log('Delete document response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },

  // Contact person management
  addContact: async (principalId: string, contactData: ContactPersonFormData) => {
    try {
      console.log('Adding contact to principal:', principalId);
      const response = await api.post(`/principals/${principalId}/contacts`, contactData);
      console.log('Add contact response:', response.data);
      return response;
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  },

  updateContact: async (principalId: string, contactId: string, contactData: ContactPersonFormData) => {
    try {
      console.log('Updating contact:', contactId, 'for principal:', principalId);
      const response = await api.put(`/principals/${principalId}/contacts/${contactId}`, contactData);
      console.log('Update contact response:', response.data);
      return response;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  },

  deleteContact: async (principalId: string, contactId: string) => {
    try {
      console.log('Deleting contact:', contactId, 'for principal:', principalId);
      const response = await api.delete(`/principals/${principalId}/contacts/${contactId}`);
      console.log('Delete contact response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting contact:', error);
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

  // Statistics
  getPrincipalStats: async () => {
    try {
      console.log('Fetching principal statistics');
      const response = await api.get('/principals/stats');
      console.log('Principal stats response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching principal stats:', error);
      throw error;
    }
  },
};