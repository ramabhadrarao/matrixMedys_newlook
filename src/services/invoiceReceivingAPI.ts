// src/services/invoiceReceivingAPI.ts
import api from './api';
import { useAuthStore } from '../store/authStore';

// Interfaces
export interface ReceivedProduct {
  product: string;
  productCode?: string;
  productName?: string;
  orderedQty: number;
  receivedQty: number;
  foc?: number;
  unitPrice?: number;
  batchNo?: string;
  mfgDate?: string;
  expDate?: string;
  status: 'received' | 'backlog' | 'damaged' | 'rejected';
  remarks?: string;
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
}

export interface InvoiceReceiving {
  _id: string;
  purchaseOrder: {
    _id: string;
    poNumber: string;
  } | string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  dueDate?: string;
  receivedDate: string;
  receivedBy: {
    _id: string;
    name: string;
  };
  products: ReceivedProduct[];
  documents: InvoiceDocument[];
  qcStatus: 'pending' | 'in_progress' | 'passed' | 'failed' | 'partial_pass';
  qcDate?: string;
  qcBy?: {
    _id: string;
    name: string;
  };
  qcRemarks?: string;
  status: 'draft' | 'submitted' | 'qc_pending' | 'completed' | 'rejected';
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
  invoiceAmount: number;
  dueDate?: string;
  receivedDate?: string;
  products: Array<{
    product: string;
    productCode?: string;
    productName?: string;
    orderedQty: number;
    receivedQty: number;
    foc?: number;
    unitPrice?: number;
    batchNo?: string;
    mfgDate?: string;
    expDate?: string;
    status?: 'received' | 'backlog' | 'damaged' | 'rejected';
    remarks?: string;
  }>;
  documents?: File[];
}

export interface QCCheckData {
  qcStatus: 'passed' | 'failed' | 'partial_pass';
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
  page?: number;
  limit?: number;
}

// Helper function for file uploads with progress
const createFormDataRequest = async (
  url: string,
  data: InvoiceReceivingFormData | FormData,
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
      
      // Add regular fields
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          if (key === 'documents' && Array.isArray(value)) {
            value.forEach((file: File) => {
              requestData.append('documents', file);
            });
          } else if (key === 'products' && Array.isArray(value)) {
            requestData.append('products', JSON.stringify(value));
          } else {
            requestData.append(key, value.toString());
          }
        }
      });
    }

    xhr.send(requestData);
  });
};

// Invoice & Receiving API Service
export const invoiceReceivingAPI = {
  // Get all invoice receivings
  getInvoiceReceivings: async (filters?: InvoiceReceivingFilters): Promise<{ invoiceReceivings: InvoiceReceiving[] }> => {
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
  getInvoiceReceiving: async (id: string): Promise<{ invoiceReceiving: InvoiceReceiving }> => {
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
    onProgress?: (progress: number) => void
  ): Promise<{ message: string; invoiceReceiving: InvoiceReceiving }> => {
    try {
      console.log('Creating invoice receiving:', data);
      
      if (data.documents && data.documents.length > 0) {
        // Use FormData for file upload
        const response = await createFormDataRequest('/invoice-receiving', data, 'POST', onProgress);
        console.log('Create invoice receiving response:', response);
        return response;
      } else {
        // Regular JSON request
        const { documents, ...invoiceData } = data;
        const response = await api.post('/invoice-receiving', invoiceData);
        console.log('Create invoice receiving response:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('Error creating invoice receiving:', error);
      throw error;
    }
  },

  // Update invoice receiving
  updateInvoiceReceiving: async (
    id: string,
    data: Partial<InvoiceReceivingFormData>,
    onProgress?: (progress: number) => void
  ): Promise<{ message: string; invoiceReceiving: InvoiceReceiving }> => {
    try {
      console.log('Updating invoice receiving:', id, data);
      
      if (data.documents && data.documents.length > 0) {
        // Use FormData for file upload
        const response = await createFormDataRequest(`/invoice-receiving/${id}`, data as InvoiceReceivingFormData, 'PUT', onProgress);
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
  submitToQC: async (id: string): Promise<{ message: string; invoiceReceiving: InvoiceReceiving }> => {
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
  performQCCheck: async (id: string, data: QCCheckData): Promise<{ message: string; invoiceReceiving: InvoiceReceiving }> => {
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
  getByPurchaseOrder: async (purchaseOrderId: string): Promise<{ invoiceReceivings: InvoiceReceiving[] }> => {
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
    }> = {};

    invoiceReceivings.forEach(receiving => {
      receiving.products.forEach(product => {
        if (!productReceivingSummary[product.product]) {
          productReceivingSummary[product.product] = {
            totalReceived: 0,
            totalDamaged: 0,
            totalRejected: 0,
            totalBacklog: 0
          };
        }

        const summary = productReceivingSummary[product.product];
        
        switch (product.status) {
          case 'received':
            summary.totalReceived += product.receivedQty;
            break;
          case 'damaged':
            summary.totalDamaged += product.receivedQty;
            break;
          case 'rejected':
            summary.totalRejected += product.receivedQty;
            break;
          case 'backlog':
            summary.totalBacklog += product.receivedQty;
            break;
        }
      });
    });

    return productReceivingSummary;
  }
};

export default invoiceReceivingAPI;