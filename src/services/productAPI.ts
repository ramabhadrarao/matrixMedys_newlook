// src/services/productAPI.ts - Updated with new fields
import api from './api';
import { useAuthStore } from '../store/authStore';

// Interfaces
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
  
  // NEW FIELDS
  photo?: {
    filename: string | null;
    originalName: string | null;
    mimetype: string | null;
    size: number | null;
    uploadedAt: string | null;
    uploadedBy: {
      _id: string;
      name: string;
    } | null;
  };
  batchNo?: string | null;
  mfgDate?: string | null;
  expDate?: string | null;
  mrp: number;
  dealerPrice: number;
  defaultDiscount?: {
    type: 'percentage' | 'amount';
    value: number;
  };
  
  // Computed fields (virtuals from backend)
  effectivePrice?: number;
  isExpired?: boolean;
  daysUntilExpiry?: number | null;
  
  // Existing fields
  categoryPath?: string;
  categoryAncestors?: Array<{
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
  
  // NEW FIELDS
  photo?: File;
  batchNo?: string;
  mfgDate?: string;
  expDate?: string;
  mrp: number;
  dealerPrice: number;
  defaultDiscount?: {
    type: 'percentage' | 'amount';
    value: number;
  };
  
  // Existing fields
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
  includeSubcategories?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedProductResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Helper function for file uploads with progress
const createFormDataRequest = async (
  url: string,
  data: FormData | ProductFormData,
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
          resolve(response);
        } catch (e) {
          resolve(xhr.responseText);
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
      
      // Add all fields to FormData
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          if (key === 'photo' && value instanceof File) {
            requestData.append('photo', value);
          } else if (key === 'documents' && Array.isArray(value)) {
            value.forEach((file: File) => {
              requestData.append('documents', file);
            });
          } else if (key === 'documentNames' && Array.isArray(value)) {
            value.forEach((name: string) => {
              requestData.append('documentNames', name);
            });
          } else if (key === 'defaultDiscount' && typeof value === 'object') {
            requestData.append('defaultDiscount', JSON.stringify(value));
          } else {
            requestData.append(key, value.toString());
          }
        }
      });
    }

    xhr.send(requestData);
  });
};

// Product API Service
export const productAPI = {
  // Get all products
  getProducts: async (filters?: ProductFilters): Promise<PaginatedProductResponse> => {
    try {
      console.log('Fetching products with filters:', filters);
      const response = await api.get('/products', { params: filters });
      console.log('Products response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get single product
  getProduct: async (id: string): Promise<{ product: Product; breadcrumb: string }> => {
    try {
      console.log('Fetching product:', id);
      const response = await api.get(`/products/${id}`);
      console.log('Product response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  // Create product
  createProduct: async (
    data: ProductFormData,
    onProgress?: (progress: number) => void
  ): Promise<{ message: string; product: Product }> => {
    try {
      console.log('Creating product:', data);
      
      if (data.photo || (data.documents && data.documents.length > 0)) {
        // Use FormData for file upload
        const response = await createFormDataRequest('/products', data, 'POST', onProgress);
        console.log('Create product response:', response);
        return response;
      } else {
        // Regular JSON request
        const { photo, documents, ...productData } = data;
        const response = await api.post('/products', productData);
        console.log('Create product response:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  // Update product
  updateProduct: async (
    id: string,
    data: Partial<ProductFormData>,
    onProgress?: (progress: number) => void
  ): Promise<{ message: string; product: Product }> => {
    try {
      console.log('Updating product:', id, data);
      
      if (data.photo || (data.documents && data.documents.length > 0)) {
        // Use FormData for file upload
        const response = await createFormDataRequest(`/products/${id}`, data as ProductFormData, 'PUT', onProgress);
        console.log('Update product response:', response);
        return response;
      } else {
        // Regular JSON request
        const { photo, documents, ...productData } = data;
        const response = await api.put(`/products/${id}`, productData);
        console.log('Update product response:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  // Update product with photo (specialized method)
  updateProductWithPhoto: async (
    id: string,
    data: ProductFormData,
    onProgress?: (progress: number) => void
  ): Promise<{ message: string; product: Product }> => {
    try {
      console.log('Updating product with photo:', id, data);
      
      const formData = new FormData();
      
      // Add all fields to FormData
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          if (key === 'photo' && value instanceof File) {
            formData.append('photo', value);
          } else if (key === 'documents' && Array.isArray(value)) {
            value.forEach((file: File) => {
              formData.append('documents', file);
            });
          } else if (key === 'defaultDiscount' && typeof value === 'object') {
            formData.append('defaultDiscountType', value.type);
            formData.append('defaultDiscountValue', value.value.toString());
          } else {
            formData.append(key, value.toString());
          }
        }
      });
      
      const response = await createFormDataRequest(`/products/${id}/photo`, formData, 'PUT', onProgress);
      console.log('Update product with photo response:', response);
      return response;
    } catch (error) {
      console.error('Error updating product with photo:', error);
      throw error;
    }
  },

  // Delete product
  deleteProduct: async (id: string): Promise<{ message: string }> => {
    try {
      console.log('Deleting product:', id);
      const response = await api.delete(`/products/${id}`);
      console.log('Delete product response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  // Add document to product
  addProductDocument: async (
    id: string,
    file: File,
    name?: string,
    onProgress?: (progress: number) => void
  ): Promise<{ message: string; document: ProductDocument }> => {
    try {
      console.log('Adding document to product:', id);
      
      const formData = new FormData();
      formData.append('document', file);
      if (name) {
        formData.append('name', name);
      }
      
      const response = await createFormDataRequest(`/products/${id}/documents`, formData, 'POST', onProgress);
      console.log('Add document response:', response);
      return response;
    } catch (error) {
      console.error('Error adding product document:', error);
      throw error;
    }
  },

  // Delete product document
  deleteProductDocument: async (productId: string, documentId: string): Promise<{ message: string }> => {
    try {
      console.log('Deleting product document:', productId, documentId);
      const response = await api.delete(`/products/${productId}/documents/${documentId}`);
      console.log('Delete document response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error deleting product document:', error);
      throw error;
    }
  },

  // Get products by category
  getProductsByCategory: async (categoryId: string, includeSubcategories: boolean = true): Promise<{ products: Product[] }> => {
    try {
      console.log('Fetching products by category:', categoryId);
      const response = await api.get(`/products/category/${categoryId}`, {
        params: { includeSubcategories }
      });
      console.log('Products by category response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }
  },

  // Get products for PO (with pricing info)
  getProductsForPO: async (principalId: string, portfolioId?: string): Promise<{ products: Product[] }> => {
    try {
      const params: any = {
        principal: principalId,
        limit: 1000 // Get all products for selection
      };
      
      if (portfolioId) {
        params.portfolio = portfolioId;
      }
      
      console.log('Fetching products for PO:', params);
      const response = await api.get('/products', { params });
      console.log('Products for PO response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching products for PO:', error);
      throw error;
    }
  },

  // Calculate product price with discount
  calculatePrice: (
    product: Product,
    quantity: number,
    customDiscount?: { type: 'percentage' | 'amount'; value: number }
  ): number => {
    let basePrice = product.dealerPrice * quantity;
    
    // Apply custom discount if provided, otherwise use default
    const discount = customDiscount || product.defaultDiscount;
    
    if (discount && discount.value > 0) {
      if (discount.type === 'percentage') {
        basePrice -= (basePrice * discount.value / 100);
      } else {
        basePrice -= discount.value;
      }
    }
    
    return basePrice;
  },

  // Check stock validity
  checkStockValidity: (product: Product): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } => {
    const result = {
      isValid: true,
      warnings: [] as string[],
      errors: [] as string[]
    };
    
    // Check if expired
    if (product.isExpired) {
      result.errors.push('Product has expired');
      result.isValid = false;
    }
    
    // Check if expiring soon (within 30 days)
    if (product.daysUntilExpiry !== null && product.daysUntilExpiry <= 30 && product.daysUntilExpiry > 0) {
      result.warnings.push(`Product expiring in ${product.daysUntilExpiry} days`);
    }
    
    // Check if batch number is missing when dates are present
    if ((product.mfgDate || product.expDate) && !product.batchNo) {
      result.warnings.push('Batch number is missing for product with manufacturing/expiry date');
    }
    
    return result;
  },

  // Format price for display
  formatPrice: (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
};

export default productAPI;