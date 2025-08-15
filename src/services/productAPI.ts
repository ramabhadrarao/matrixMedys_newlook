import api, { handleApiError } from './api';
import { useAuthStore } from '../store/authStore';

export interface ProductDocument {
  _id: string;
  name: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface Product {
  _id: string;
  name: string;
  code: string;
  category: {
    _id: string;
    name: string;
    path?: string;
  };
  principal: {
    _id: string;
    name: string;
  };
  portfolio: {
    _id: string;
    name: string;
  };
  categoryPath: string;
  categoryAncestors: Array<{
    _id: string;
    name: string;
  }>;
  gstPercentage: number;
  specification?: string;
  remarks?: string;
  documents: ProductDocument[];
  documentsCount?: number;
  unit: 'PCS' | 'BOX' | 'KG' | 'GM' | 'LTR' | 'ML' | 'MTR' | 'CM' | 'DOZEN' | 'PACK';
  sku?: string;
  barcode?: string;
  hsnCode?: string;
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

export interface ProductFormData {
  name: string;
  code: string;
  category: string;
  gstPercentage: number;
  specification?: string;
  remarks?: string;
  unit?: string;
  hsnCode?: string;
  barcode?: string;
  isActive?: boolean;
  documents?: File[];
  documentNames?: string[];
}

export interface ProductFilters {
  search?: string;
  category?: string;
  principal?: string;
  portfolio?: string;
  minGst?: number;
  maxGst?: number;
  unit?: string;
  isActive?: boolean;
  includeSubcategories?: boolean;
}

// Helper function for file uploads with progress
const createFormDataRequest = async (
  url: string,
  data: ProductFormData | FormData,
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

export const productAPI = {
  // Get products with filters
  getProducts: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    principal?: string;
    portfolio?: string;
    includeSubcategories?: boolean;
  }) => {
    try {
      console.log('Fetching products with params:', params);
      const response = await api.get('/products', { params });
      console.log('Products API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get single product
  getProduct: async (id: string) => {
    try {
      console.log('Fetching product with ID:', id);
      const response = await api.get(`/products/${id}`);
      console.log('Product API response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  // Get products by category
  getProductsByCategory: async (categoryId: string, includeSubcategories = true) => {
    try {
      console.log('Fetching products for category:', categoryId);
      const response = await api.get(`/products/category/${categoryId}`, {
        params: { includeSubcategories }
      });
      console.log('Products by category response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }
  },

  // Create product
  createProduct: async (data: ProductFormData, onProgress?: (progress: number) => void) => {
    try {
      console.log('Creating product with data:', data);

      if (data.documents && data.documents.length > 0) {
        return await createFormDataRequest('/products', data, 'POST', onProgress);
      } else {
        const { documents, documentNames, ...productData } = data;
        const response = await api.post('/products', productData);
        console.log('Create product response:', response.data);
        return response;
      }
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  // Update product
  updateProduct: async (id: string, data: ProductFormData, onProgress?: (progress: number) => void) => {
    try {
      console.log('Updating product:', id, 'with data:', data);

      if (data.documents && data.documents.length > 0) {
        return await createFormDataRequest(`/products/${id}`, data, 'PUT', onProgress);
      } else {
        const { documents, documentNames, ...productData } = data;
        const response = await api.put(`/products/${id}`, productData);
        console.log('Update product response:', response.data);
        return response;
      }
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  // Delete product
  deleteProduct: async (id: string) => {
    try {
      console.log('Deleting product with ID:', id);
      const response = await api.delete(`/products/${id}`);
      console.log('Delete product response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  // Add document to product
  addDocument: async (productId: string, file: File, name?: string, onProgress?: (progress: number) => void) => {
    try {
      console.log('Adding document to product:', productId);

      const formData = new FormData();
      formData.append('document', file);
      if (name) {
        formData.append('name', name);
      }

      return await createFormDataRequest(`/products/${productId}/documents`, formData, 'POST', onProgress);
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  },

  // Delete document from product
  deleteDocument: async (productId: string, documentId: string) => {
    try {
      console.log('Deleting document:', documentId, 'from product:', productId);
      const response = await api.delete(`/products/${productId}/documents/${documentId}`);
      console.log('Delete document response:', response.data);
      return response;
    } catch (error) {
      console.error('Error deleting document:', error);
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

  // Advanced search
  searchProducts: async (filters: ProductFilters, page = 1, limit = 10) => {
    try {
      const params = {
        page,
        limit,
        ...filters
      };
      const response = await api.get('/products', { params });
      return response.data;
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  },

  // Export products (for future implementation)
  exportProducts: async (filters: ProductFilters, format: 'csv' | 'excel' | 'pdf' = 'excel') => {
    try {
      const params = {
        ...filters,
        format
      };
      const response = await api.get('/products/export', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products-${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return response;
    } catch (error) {
      console.error('Error exporting products:', error);
      throw error;
    }
  }
};