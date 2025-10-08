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

// Invoice & Receiving API Service
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
      console.error('Error fetching invoice receivings:', error);
      throw error;
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
      console.error('Error fetching invoice receiving:', error);
      throw error;
    }
  },

  // Create invoice receiving
  createInvoiceReceiving: async (
    data: InvoiceReceivingFormData,
    productImages?: File[],
    productImageMapping?: Array<{ productIndex: number }>,
    onProgress?: (progress: number) => void
  ): Promise<{ message: string; data: InvoiceReceiving }> => {
    try {
      console.log('Creating invoice receiving:', data);
      
      // Always use FormData for consistency
      const formData = new FormData();
      
      // Add regular fields
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          if (key === 'documents' && Array.isArray(value)) {
            value.forEach((file: File) => {
              formData.append('documents', file);
            });
          } else if (key === 'receivedProducts' && Array.isArray(value)) {
            formData.append('products', JSON.stringify(value));
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
        formData.append('productImageMappings', JSON.stringify(productImageMapping));
      }
      
      const response = await createFormDataRequest('/invoice-receiving', formData, 'POST', onProgress);
      console.log('Create invoice receiving response:', response);
      return response;
    } catch (error) {
      console.error('Error creating invoice receiving:', error);
      throw error;
    }
  },

  // Update invoice receiving
  updateInvoiceReceiving: async (
    id: string,
    data: Partial<InvoiceReceivingFormData>,
    productImages?: File[],
    productImageMapping?: Array<{ productIndex: number }>,
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
      console.error('Error updating invoice receiving:', error);
      throw error;
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
      console.error('Error submitting to QC:', error);
      throw error;
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
      console.error('Error performing QC check:', error);
      throw error;
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
      console.error('Error updating QC status:', error);
      throw error;
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
      console.error('Error deleting invoice receiving:', error);
      throw error;
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
      console.error('Error fetching invoice receivings by PO:', error);
      throw error;
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
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `invoice-receiving-${id}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  }
};

export default invoiceReceivingAPI;

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