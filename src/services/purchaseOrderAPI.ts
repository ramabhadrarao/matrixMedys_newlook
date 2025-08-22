// src/services/purchaseOrderAPI.ts
import api from './api';

// Interfaces
export interface ProductLine {
  product: string;
  productCode?: string;
  productName?: string;
  description?: string;
  unitPrice: number;
  quantity: number;
  foc?: number;
  discount?: {
    type: 'percentage' | 'amount';
    value: number;
  };
  totalCost?: number;
  remarks?: string;
  receivedQty?: number;
  backlogQty?: number;
  receivingHistory?: Array<{
    receivedQty: number;
    receivedDate: string;
    receivedBy: {
      _id: string;
      name: string;
    };
    invoiceNumber: string;
    batchNo?: string;
    mfgDate?: string;
    expDate?: string;
    remarks?: string;
    createdAt: string;
  }>;
}

export interface BillingShipping {
  branchWarehouse: string;
  name: string;
  address: string;
  gstin: string;
  drugLicense: string;
  phone: string;
}

export interface WorkflowHistory {
  _id: string;
  stage: {
    _id: string;
    name: string;
    code: string;
  };
  action: string;
  actionBy: {
    _id: string;
    name: string;
    email: string;
  };
  actionDate: string;
  remarks?: string;
  changes?: any;
}

export interface PurchaseOrder {
  _id: string;
  poNumber: string;
  poDate: string;
  principal: {
    _id: string;
    name: string;
    gstNumber?: string;
    email?: string;
    mobile?: string;
  };
  billTo: BillingShipping;
  shipTo: BillingShipping;
  products: ProductLine[];
  subTotal: number;
  productLevelDiscount: number;
  additionalDiscount?: {
    type: 'percentage' | 'amount';
    value: number;
  };
  taxType: 'IGST' | 'CGST_SGST';
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  shippingCharges?: {
    type: 'percentage' | 'amount';
    value: number;
  };
  grandTotal: number;
  toEmails: string[];
  fromEmail?: string;
  ccEmails?: string[];
  currentStage?: {
    _id: string;
    name: string;
    code: string;
    allowedActions: string[];
  };
  workflowHistory: WorkflowHistory[];
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'ordered' | 
          'partial_received' | 'received' | 'qc_pending' | 'qc_passed' | 
          'qc_failed' | 'completed' | 'cancelled';
  templateId?: string;
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
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  approvedDate?: string;
  isFullyReceived: boolean;
  totalReceivedQty: number;
  totalBacklogQty: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderFormData {
  principal: string;
  billTo: BillingShipping;
  shipTo: BillingShipping;
  products: Array<{
    product: string;
    productCode?: string;
    productName?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    foc?: number;
    discount?: {
      type: 'percentage' | 'amount';
      value: number;
    };
    remarks?: string;
  }>;
  additionalDiscount?: {
    type: 'percentage' | 'amount';
    value: number;
  };
  taxType?: 'IGST' | 'CGST_SGST';
  gstRate?: number;
  shippingCharges?: {
    type: 'percentage' | 'amount';
    value: number;
  };
  toEmails: string[];
  fromEmail?: string;
  ccEmails?: string[];
}

export interface POFilters {
  status?: string;
  principal?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  purchaseOrders: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Purchase Order API Service
// Update the getPurchaseOrders method in src/services/purchaseOrderAPI.ts

export const purchaseOrderAPI = {
  // Get all purchase orders with pagination
  getPurchaseOrders: async (filters?: POFilters): Promise<any> => {
    try {
      console.log('Fetching purchase orders with filters:', filters);
      const response = await api.get('/purchase-orders', { params: filters });
      console.log('Raw API response:', response);
      
      // Return the data directly - axios response is in response.data
      return response.data;
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      throw error;
    }
  },

  // Get single purchase order
  getPurchaseOrder: async (id: string): Promise<any> => {
    try {
      console.log('Fetching purchase order:', id);
      const response = await api.get(`/purchase-orders/${id}`);
      console.log('Purchase order response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      throw error;
    }
  },

  // Create purchase order
  createPurchaseOrder: async (data: PurchaseOrderFormData): Promise<any> => {
    try {
      console.log('Creating purchase order:', data);
      const response = await api.post('/purchase-orders', data);
      console.log('Create PO response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  },

  // Update purchase order
  updatePurchaseOrder: async (id: string, data: Partial<PurchaseOrderFormData>): Promise<any> => {
    try {
      console.log('Updating purchase order:', id, data);
      const response = await api.put(`/purchase-orders/${id}`, data);
      console.log('Update PO response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating purchase order:', error);
      throw error;
    }
  },

  // Other methods remain the same...
  // Delete purchase order (only draft)
  deletePurchaseOrder: async (id: string): Promise<any> => {
    try {
      console.log('Deleting purchase order:', id);
      const response = await api.delete(`/purchase-orders/${id}`);
      console.log('Delete PO response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      throw error;
    }
  },

  // Workflow Actions
  approvePurchaseOrder: async (id: string, remarks?: string): Promise<any> => {
    try {
      console.log('Approving purchase order:', id);
      const response = await api.post(`/purchase-orders/${id}/approve`, { remarks });
      console.log('Approve PO response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error approving purchase order:', error);
      throw error;
    }
  },

  rejectPurchaseOrder: async (id: string, remarks: string): Promise<any> => {
    try {
      console.log('Rejecting purchase order:', id);
      const response = await api.post(`/purchase-orders/${id}/reject`, { remarks });
      console.log('Reject PO response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error rejecting purchase order:', error);
      throw error;
    }
  },

  sendPurchaseOrder: async (id: string): Promise<any> => {
    try {
      console.log('Sending purchase order:', id);
      const response = await api.post(`/purchase-orders/${id}/send`);
      console.log('Send PO response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending purchase order:', error);
      throw error;
    }
  },

  cancelPurchaseOrder: async (id: string): Promise<any> => {
    try {
      console.log('Cancelling purchase order:', id);
      const response = await api.post(`/purchase-orders/${id}/cancel`);
      console.log('Cancel PO response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error cancelling purchase order:', error);
      throw error;
    }
  },

  downloadPurchaseOrder: async (id: string): Promise<any> => {
    try {
      console.log('Downloading purchase order:', id);
      const response = await api.get(`/purchase-orders/${id}/download`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error downloading purchase order:', error);
      throw error;
    }
  },

  // Keep the calculateTotals helper function
  calculateTotals: (formData: Partial<PurchaseOrderFormData>) => {
    const products = formData.products || [];
    
    // Calculate subtotal
    const subTotal = products.reduce((sum, item) => {
      const qty = item.quantity - (item.foc || 0);
      let itemTotal = qty * item.unitPrice;
      
      // Apply item discount
      if (item.discount && item.discount.value > 0) {
        if (item.discount.type === 'percentage') {
          itemTotal -= (itemTotal * item.discount.value / 100);
        } else {
          itemTotal -= item.discount.value;
        }
      }
      
      return sum + itemTotal;
    }, 0);
    
    // Calculate product level discount
    const productLevelDiscount = products.reduce((sum, item) => {
      if (item.discount && item.discount.value > 0) {
        const qty = item.quantity - (item.foc || 0);
        if (item.discount.type === 'percentage') {
          return sum + (qty * item.unitPrice * item.discount.value / 100);
        } else {
          return sum + item.discount.value;
        }
      }
      return sum;
    }, 0);
    
    // Apply additional discount
    let totalAfterDiscount = subTotal;
    if (formData.additionalDiscount && formData.additionalDiscount.value > 0) {
      if (formData.additionalDiscount.type === 'percentage') {
        totalAfterDiscount -= (totalAfterDiscount * formData.additionalDiscount.value / 100);
      } else {
        totalAfterDiscount -= formData.additionalDiscount.value;
      }
    }
    
    // Calculate GST
    const gstRate = formData.gstRate || 5;
    const gstAmount = totalAfterDiscount * (gstRate / 100);
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    
    if (formData.taxType === 'CGST_SGST') {
      cgst = gstAmount / 2;
      sgst = gstAmount / 2;
    } else {
      igst = gstAmount;
    }
    
    // Add shipping charges
    let shippingAmount = 0;
    if (formData.shippingCharges && formData.shippingCharges.value > 0) {
      if (formData.shippingCharges.type === 'percentage') {
        shippingAmount = totalAfterDiscount * (formData.shippingCharges.value / 100);
      } else {
        shippingAmount = formData.shippingCharges.value;
      }
    }
    
    // Calculate grand total
    const grandTotal = totalAfterDiscount + gstAmount + shippingAmount;
    
    return {
      subTotal,
      productLevelDiscount,
      totalAfterDiscount,
      cgst,
      sgst,
      igst,
      gstAmount,
      shippingAmount,
      grandTotal
    };
  }
};

export default purchaseOrderAPI;