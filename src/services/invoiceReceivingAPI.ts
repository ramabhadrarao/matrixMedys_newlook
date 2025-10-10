// src/services/invoiceReceivingAPI.ts - COMPLETE FIXED VERSION
import api from './api';
import { useAuthStore } from '../store/authStore';

// Interfaces
export interface ReceivedProduct {
  _id?: string;
  product?: string;
  productCode: string;
  productName: string;
  orderedQty: number;
  receivedQty: number;
  foc?: number;
  unitPrice: number;
  unit?: string;
  batchNo?: string;
  mfgDate?: string;
  expDate?: string;
  status: 'received' | 'backlog' | 'damaged' | 'rejected';
  remarks?: string;
  qcStatus?: 'pending' | 'passed' | 'failed' | 'not_required';
  qcRemarks?: string;
}

export interface InvoiceDocument {
  _id: string;
  name: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  type?: string; // Document type (Invoice, Delivery Note, etc.)
  uploadedAt: string;
  uploadedBy: {
    _id: string;
    name: string;
  };
  url?: string;
}

export interface InvoiceReceiving {
  _id: string;
  purchaseOrder: {
    _id: string;
    poNumber: string;
    status: string;
    supplier?: string;
  };
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount?: number;
  supplier: string;
  dueDate?: string;
  receivedDate: string;
  receivedBy: {
    _id: string;
    name: string;
  };
  receivedProducts: ReceivedProduct[];
  documents: InvoiceDocument[];
  qcStatus?: 'pending' | 'in_progress' | 'passed' | 'failed' | 'partial_pass' | 'not_required';
  qcRequired: boolean;
  qcDate?: string;
  qcBy?: {
    _id: string;
    name: string;
  };
  qcRemarks?: string;
  status: 'draft' | 'submitted' | 'qc_pending' | 'completed' | 'rejected';
  notes?: string;
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

export interface InvoiceReceivingFormData {
  purchaseOrder: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount?: number;
  supplier: string;
  dueDate?: string;
  receivedDate: string;
  receivedProducts: ReceivedProduct[];
  documents?: File[];
  notes?: string;
  qcRequired?: boolean;
}

export interface QCCheckData {
  qcStatus: 'passed' | 'failed' | 'partial';
  qcRemarks: string;
  productQCResults?: Array<{
    productId: string;
    status: 'passed' | 'failed' | 'damaged';
    remarks?: string;
  }>;
}

export interface InvoiceReceivingFilters {
  purchaseOrder?: string;
  status?: string;
  qcStatus?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface QCUpdateData {
  productIndex: number;
  qcStatus: 'passed' | 'failed' | 'pending';
  qcRemarks?: string;
  qcBy?: string;
  qcDate?: string;
}

// Helper function for file uploads with progress
const createFormDataRequest = async (
  url: string,
  data: FormData,
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

    xhr.send(data);
  });
};

// Enhanced error handling utility
const handleAPIError = (error: any, operation: string) => {
  console.error(`Error ${operation}:`, error);
  
  // Extract meaningful error message
  let errorMessage = `Failed to ${operation}`;
  
  if (error.response?.data?.message) {
    errorMessage = error.response.data.message;
  } else if (error.response?.data?.error) {
    errorMessage = error.response.data.error;
  } else if (error.message) {
    errorMessage = error.message;
  }
  
  // Handle specific error codes
  if (error.response?.status === 400) {
    if (error.response.data?.validationErrors) {
      const validationErrors = error.response.data.validationErrors;
      const errorMessages = Object.values(validationErrors).join(', ');
      errorMessage = `Validation failed: ${errorMessages}`;
    } else if (errorMessage.includes('duplicate')) {
      errorMessage = 'This invoice number already exists. Please use a different invoice number.';
    } else if (errorMessage.includes('quantity')) {
      errorMessage = 'Invalid quantity: Received quantity cannot exceed remaining quantity.';
    } else if (errorMessage.includes('date')) {
      errorMessage = 'Invalid date: Please check your date entries.';
    }
  } else if (error.response?.status === 401) {
    errorMessage = 'Authentication failed. Please log in again.';
  } else if (error.response?.status === 403) {
    errorMessage = 'You do not have permission to perform this action.';
  } else if (error.response?.status === 404) {
    errorMessage = 'The requested resource was not found.';
  } else if (error.response?.status === 409) {
    errorMessage = 'Conflict: This operation cannot be completed due to a data conflict.';
  } else if (error.response?.status === 422) {
    errorMessage = 'Invalid data provided. Please check your inputs and try again.';
  } else if (error.response?.status >= 500) {
    errorMessage = 'Server error occurred. Please try again later or contact support.';
  } else if (error.code === 'NETWORK_ERROR' || !error.response) {
    errorMessage = 'Network error. Please check your internet connection and try again.';
  }
  
  // Create enhanced error object
  const enhancedError = new Error(errorMessage);
  (enhancedError as any).originalError = error;
  (enhancedError as any).statusCode = error.response?.status;
  (enhancedError as any).validationErrors = error.response?.data?.validationErrors;
  
  throw enhancedError;
};
export const invoiceReceivingAPI = {
  // Get all invoice receivings
  getInvoiceReceivings: async (filters?: InvoiceReceivingFilters): Promise<{ 
    data: { 
      invoiceReceivings: InvoiceReceiving[]; 
      totalCount?: number; 
      currentPage?: number; 
      totalPages?: number 
    } 
  }> => {
    try {
      console.log('Fetching invoice receivings:', filters);
      const response = await api.get('/invoice-receiving', { params: filters });
      console.log('Invoice receivings response:', response.data);
      return response.data;
    } catch (error) {
      handleAPIError(error, 'fetch invoice receivings');
    }
  },

  // Get single invoice receiving
  getInvoiceReceiving: async (id: string): Promise<{ data: InvoiceReceiving }> => {
    try {
      console.log('Fetching invoice receiving:', id);
      const response = await api.get(`/invoice-receiving/${id}`);
      console.log('Invoice receiving response:', response.data);
      return response.data;
    } catch (error) {
      handleAPIError(error, 'fetch invoice receiving details');
    }
  },

  // Create invoice receiving
  createInvoiceReceiving: async (
    data: InvoiceReceivingFormData,
    productImages?: File[],
    productImageMapping?: Array<{ productIndex: number }>,
    documentTypes?: string[],
    customDocumentTypes?: string[],
    onProgress?: (progress: number) => void
  ): Promise<{ message: string; data: InvoiceReceiving }> => {
    try {
      const formData = new FormData();
      
      // Add basic form data
      formData.append('purchaseOrder', data.purchaseOrder);
      formData.append('invoiceNumber', data.invoiceNumber);
      formData.append('invoiceDate', data.invoiceDate);
      formData.append('invoiceAmount', (data.invoiceAmount || 0).toString());
      formData.append('supplier', data.supplier);
      formData.append('receivedDate', data.receivedDate);
      formData.append('notes', data.notes || '');
      formData.append('qcRequired', (data.qcRequired !== false).toString());
      
      // Add received products
      formData.append('receivedProducts', JSON.stringify(data.receivedProducts));
      
      // Add documents with types
      if (data.documents && data.documents.length > 0) {
        data.documents.forEach((file) => {
          formData.append('documents', file);
        });
        
        // Add document types as JSON strings
        if (documentTypes && documentTypes.length > 0) {
          formData.append('documentTypes', JSON.stringify(documentTypes));
        }
        
        if (customDocumentTypes && customDocumentTypes.length > 0) {
          formData.append('customDocumentTypes', JSON.stringify(customDocumentTypes));
        }
      }
      
      // Add product images
      if (productImages && productImages.length > 0) {
        productImages.forEach((file) => {
          formData.append('productImages', file);
        });
        
        if (productImageMapping) {
          formData.append('productImageMapping', JSON.stringify(productImageMapping));
        }
      }

      return createFormDataRequest('/invoice-receiving', formData, 'POST', onProgress);
    } catch (error) {
      handleAPIError(error, 'create invoice receiving');
    }
  },

  // Update invoice receiving
  updateInvoiceReceiving: async (
    id: string,
    data: Partial<InvoiceReceivingFormData>,
    productImages?: File[],
    productImageMapping?: Array<{ productIndex: number }>,
    documentTypes?: string[],
    customDocumentTypes?: string[],
    onProgress?: (progress: number) => void
  ): Promise<{ message: string; data: InvoiceReceiving }> => {
    try {
      console.log('Updating invoice receiving:', id, data);
      
      // Check if we have files to upload (documents or product images)
      const hasFiles = (data.documents && data.documents.length > 0) || 
                      (productImages && productImages.length > 0);
      
      if (hasFiles) {
        // Use FormData for file upload
        const formData = new FormData();
        
        Object.keys(data).forEach(key => {
          const value = (data as any)[key];
          if (value !== undefined && value !== null) {
            if (key === 'documents' && Array.isArray(value)) {
              value.forEach((file: File) => {
                formData.append('documents', file);
              });
            } else if (key === 'receivedProducts' && Array.isArray(value)) {
              formData.append('receivedProducts', JSON.stringify(value));
            } else {
              formData.append(key, value.toString());
            }
          }
        });
        
        // Add product images if provided
        if (productImages && productImages.length > 0) {
          productImages.forEach((file: File) => {
            formData.append('productImages', file);
          });
        }
        
        // Add product image mapping if provided
        if (productImageMapping) {
          formData.append('productImageMapping', JSON.stringify(productImageMapping));
        }
        
        // Add document types as JSON strings
        if (documentTypes && documentTypes.length > 0) {
          formData.append('documentTypes', JSON.stringify(documentTypes));
        }
        
        if (customDocumentTypes && customDocumentTypes.length > 0) {
          formData.append('customDocumentTypes', JSON.stringify(customDocumentTypes));
        }
        
        const response = await createFormDataRequest(`/invoice-receiving/${id}`, formData, 'PUT', onProgress);
        console.log('Update invoice receiving response:', response);
        return response;
      } else {
        // Regular JSON request
        const { documents, ...invoiceData } = data;
        const response = await api.put(`/invoice-receiving/${id}`, invoiceData);
        console.log('Update invoice receiving response:', response.data);
        return response.data;
      }
    } catch (error) {
      handleAPIError(error, 'update invoice receiving');
    }
  },

  // Submit to QC
  submitToQC: async (id: string): Promise<{ message: string; data: InvoiceReceiving }> => {
    try {
      console.log('Submitting to QC:', id);
      const response = await api.post(`/invoice-receiving/${id}/submit-qc`);
      console.log('Submit to QC response:', response.data);
      return response.data;
    } catch (error) {
      handleAPIError(error, 'submit to QC');
    }
  },

  // Perform QC check
  performQCCheck: async (id: string, data: QCCheckData): Promise<{ message: string; data: InvoiceReceiving }> => {
    try {
      console.log('Performing QC check:', id, data);
      const response = await api.post(`/invoice-receiving/${id}/qc-check`, data);
      console.log('QC check response:', response.data);
      return response.data;
    } catch (error) {
      handleAPIError(error, 'perform QC check');
    }
  },

  // Update individual product QC status
  updateQCStatus: async (id: string, data: QCUpdateData): Promise<{ message: string; data: InvoiceReceiving }> => {
    try {
      console.log('Updating QC status:', id, data);
      const response = await api.put(`/invoice-receiving/${id}/qc-status`, data);
      console.log('Update QC status response:', response.data);
      return response.data;
    } catch (error) {
      handleAPIError(error, 'update QC status');
    }
  },

  // Delete invoice receiving (only draft)
  deleteInvoiceReceiving: async (id: string): Promise<{ message: string }> => {
    try {
      console.log('Deleting invoice receiving:', id);
      const response = await api.delete(`/invoice-receiving/${id}`);
      console.log('Delete invoice receiving response:', response.data);
      return response.data;
    } catch (error) {
      handleAPIError(error, 'delete invoice receiving');
    }
  },

  // Get invoice receivings by PO
  getByPurchaseOrder: async (purchaseOrderId: string): Promise<{ data: { invoiceReceivings: InvoiceReceiving[] } }> => {
    try {
      const response = await api.get('/invoice-receiving', { 
        params: { purchaseOrder: purchaseOrderId } 
      });
      console.log('Invoice receivings by PO response:', response.data);
      return response.data;
    } catch (error) {
      handleAPIError(error, 'fetch invoice receivings by purchase order');
    }
  },

  // Calculate received quantities for a PO
  calculateReceivedQuantities: (invoiceReceivings: InvoiceReceiving[]) => {
    const productReceivingSummary: Record<string, {
      totalReceived: number;
      totalDamaged: number;
      totalRejected: number;
      totalBacklog: number;
      qcStatus: string;
    }> = {};

    invoiceReceivings.forEach(receiving => {
      receiving.receivedProducts.forEach(product => {
        if (!productReceivingSummary[product.product]) {
          productReceivingSummary[product.product] = {
            totalReceived: 0,
            totalDamaged: 0,
            totalRejected: 0,
            totalBacklog: 0,
            qcStatus: 'pending'
          };
        }

        const summary = productReceivingSummary[product.product];
        
        switch (product.status) {
          case 'received':
            summary.totalReceived += product.receivedQuantity;
            break;
          case 'damaged':
            summary.totalDamaged += product.receivedQuantity;
            break;
          case 'rejected':
            summary.totalRejected += product.receivedQuantity;
            break;
          case 'backlog':
            summary.totalBacklog += product.receivedQuantity;
            break;
        }

        // Update QC status based on product QC status
        if (product.qcStatus) {
          if (summary.qcStatus === 'pending' || product.qcStatus === 'failed') {
            summary.qcStatus = product.qcStatus;
          }
        }
      });
    });

    return productReceivingSummary;
  },

  // Helper methods
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  },

  formatDate: (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  getStatusBadgeColor: (status: string): string => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'qc_pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  },

  getQCStatusBadgeColor: (qcStatus: string): string => {
    switch (qcStatus) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-orange-100 text-orange-800';
      case 'not_required':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  },

  getStatusLabel: (status: string): string => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'submitted':
        return 'Submitted';
      case 'qc_pending':
        return 'QC Pending';
      case 'completed':
        return 'Completed';
      case 'rejected':
        return 'Rejected';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  },

  getQCStatusLabel: (qcStatus: string): string => {
    switch (qcStatus) {
      case 'pending':
        return 'Pending';
      case 'passed':
        return 'Passed';
      case 'failed':
        return 'Failed';
      case 'partial':
        return 'Partial Pass';
      case 'not_required':
        return 'Not Required';
      default:
        return qcStatus?.charAt(0).toUpperCase() + qcStatus?.slice(1) || 'Unknown';
    }
  },

  // File operations
  viewFile: (filename: string) => {
    try {
      viewFileWithAuth(filename);
    } catch (error) {
      console.error('Error viewing file:', error);
      throw error;
    }
  },

  downloadFile: async (filename: string, originalName?: string) => {
    try {
      await downloadFileWithAuth(filename, originalName);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  },

  // Get file URL with token (for cases where you need the URL)
  getFileUrl: (filename: string, type: 'view' | 'download' = 'view') => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${API_BASE_URL}/files/${type}/${filename}`;
  },

  // Download PDF
  downloadPDF: async (id: string): Promise<void> => {
    try {
      console.log('Downloading PDF for invoice receiving:', id);
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = useAuthStore.getState().accessToken;
      
      const response = await fetch(`${API_BASE_URL}/invoice-receiving/${id}/download-pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } else {
          const errorText = await response.text();
          console.error('PDF download failed:', response.status, errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      // Check if response is actually a PDF
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/pdf')) {
        console.error('Response is not a PDF:', contentType);
        const responseText = await response.text();
        console.error('Response body preview:', responseText.substring(0, 500));
        throw new Error('Server did not return a PDF file');
      }
      
      const blob = await response.blob();
      
      // Validate blob size
      if (blob.size === 0) {
        throw new Error('PDF file is empty');
      }
      
      console.log('PDF blob created, size:', blob.size, 'bytes', 'type:', blob.type);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `invoice-receiving-${id}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      console.log('Download filename:', filename);
      
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log('Cleanup completed');
      }, 100);
      
      console.log('PDF download initiated successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },
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

// export default invoiceReceivingAPI;