// src/services/purchaseOrderAPI.ts
import api from './api';

// Interfaces aligned with backend models
export interface ProductLine {
  _id?: string;
  product: string;
  productCode?: string;
  productName?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  foc?: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  unit?: string;
  gstRate?: number;
  totalCost?: number;
  remarks?: string;
  
  // Receiving tracking (populated by backend)
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
  }>;
}

export interface AddressInfo {
  branchWarehouse: string;
  name: string;
  address: string;
  gstin?: string;
  drugLicense?: string;
  phone?: string;
}

export interface WorkflowHistory {
  _id: string;
  stage?: {
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
  
  // Principal info
  principal: {
    _id: string;
    name: string;
    gstNumber?: string;
    email?: string;
    mobile?: string;
  };
  
  // Address information
  billTo: AddressInfo;
  shipTo: AddressInfo;
  
  // Product lines
  products: ProductLine[];
  
  // Financial calculations
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
  
  // Communication
  toEmails: string[];
  fromEmail?: string;
  ccEmails?: string[];
  
  // Additional info
  terms?: string;
  notes?: string;
  
  // Workflow
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
  
  // Metadata
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
  
  // Virtual fields for receiving status
  isFullyReceived?: boolean;
  totalReceivedQty?: number;
  totalBacklogQty?: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderRequest {
  poNumber?: string; // Optional - backend will auto-generate if not provided
  poDate?: string;
  principal: string;
  billTo: AddressInfo;
  shipTo: AddressInfo;
  products: Array<{
    product: string;
    productCode?: string;
    productName?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    foc?: number;
    discount?: number;
    discountType?: 'percentage' | 'amount';
    unit?: string;
    gstRate?: number;
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
  terms?: string;
  notes?: string;
}

export interface UpdatePurchaseOrderRequest extends Partial<CreatePurchaseOrderRequest> {}

export interface POFilters {
  status?: string;
  principal?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedPOResponse {
  purchaseOrders: PurchaseOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface POStatsResponse {
  stats: Array<{
    _id: string;
    count: number;
    totalValue: number;
  }>;
  summary: {
    totalPOs: number;
    totalValue: number;
  };
}

// Purchase Order API Service
export const purchaseOrderAPI = {
  // Get all purchase orders with pagination and filters
  getPurchaseOrders: async (filters?: POFilters): Promise<PaginatedPOResponse> => {
    try {
      console.log('Fetching purchase orders with filters:', filters);
      const response = await api.get('/purchase-orders', { params: filters });
      console.log('PO List API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      throw error;
    }
  },

  // Get single purchase order by ID
  getPurchaseOrder: async (id: string): Promise<{ purchaseOrder: PurchaseOrder }> => {
    try {
      console.log('Fetching purchase order:', id);
      const response = await api.get(`/purchase-orders/${id}`);
      console.log('Single PO API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      throw error;
    }
  },

  // Create new purchase order
  createPurchaseOrder: async (data: CreatePurchaseOrderRequest): Promise<{
    message: string;
    purchaseOrder: PurchaseOrder;
    generatedPONumber?: string;
  }> => {
    try {
      console.log('Creating purchase order with data:', data);
      const response = await api.post('/purchase-orders', data);
      console.log('Create PO API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  },

  // Update existing purchase order
  updatePurchaseOrder: async (id: string, data: UpdatePurchaseOrderRequest): Promise<{
    message: string;
    purchaseOrder: PurchaseOrder;
  }> => {
    try {
      console.log('Updating purchase order:', id, data);
      const response = await api.put(`/purchase-orders/${id}`, data);
      console.log('Update PO API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating purchase order:', error);
      throw error;
    }
  },

  // Delete purchase order (only draft status allowed)
  deletePurchaseOrder: async (id: string): Promise<{ message: string }> => {
    try {
      console.log('Deleting purchase order:', id);
      const response = await api.delete(`/purchase-orders/${id}`);
      console.log('Delete PO API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      throw error;
    }
  },

  // ===== WORKFLOW ACTIONS =====

  // Approve purchase order
  approvePurchaseOrder: async (id: string, remarks?: string): Promise<{
    message: string;
    purchaseOrder: PurchaseOrder;
  }> => {
    try {
      console.log('Approving purchase order:', id, { remarks });
      const response = await api.post(`/purchase-orders/${id}/approve`, { remarks });
      console.log('Approve PO API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error approving purchase order:', error);
      throw error;
    }
  },

  // Reject purchase order
  rejectPurchaseOrder: async (id: string, remarks: string): Promise<{
    message: string;
    purchaseOrder: PurchaseOrder;
  }> => {
    try {
      console.log('Rejecting purchase order:', id, { remarks });
      const response = await api.post(`/purchase-orders/${id}/reject`, { remarks });
      console.log('Reject PO API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error rejecting purchase order:', error);
      throw error;
    }
  },

  // Cancel purchase order
  cancelPurchaseOrder: async (id: string, remarks?: string): Promise<{
    message: string;
    purchaseOrder: PurchaseOrder;
  }> => {
    try {
      console.log('Cancelling purchase order:', id, { remarks });
      const response = await api.post(`/purchase-orders/${id}/cancel`, { remarks });
      console.log('Cancel PO API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error cancelling purchase order:', error);
      throw error;
    }
  },

  // ===== UTILITY METHODS =====

  // Get next PO number preview
  getNextPONumber: async (principalId: string, date?: string): Promise<{
    nextPONumber: string;
    preview: boolean;
  }> => {
    try {
      console.log('Getting next PO number for principal:', principalId);
      const response = await api.get('/purchase-orders/utils/next-po-number', {
        params: { principalId, date }
      });
      console.log('Next PO number response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting next PO number:', error);
      throw error;
    }
  },

  // Validate PO number format and uniqueness
  validatePONumber: async (poNumber: string, principalId?: string): Promise<{
    message: string;
    isValid: boolean;
    expectedFormat?: string;
    example?: string;
    existingPO?: any;
  }> => {
    try {
      console.log('Validating PO number:', poNumber);
      const response = await api.post('/purchase-orders/utils/validate-po-number', {
        poNumber,
        principalId
      });
      console.log('Validate PO number response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error validating PO number:', error);
      throw error;
    }
  },

  // Get purchase order statistics
  getPOStats: async (filters?: {
    fromDate?: string;
    toDate?: string;
    principal?: string;
  }): Promise<POStatsResponse> => {
    try {
      console.log('Getting PO statistics:', filters);
      const response = await api.get('/purchase-orders/stats/dashboard', { params: filters });
      console.log('PO stats response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting PO statistics:', error);
      throw error;
    }
  },

  // ===== EMAIL AND FILE OPERATIONS =====

  // Send purchase order via email
  sendPurchaseOrderEmail: async (id: string, emailData?: {
    recipients?: string[];
    subject?: string;
    message?: string;
  }): Promise<{ message: string }> => {
    try {
      console.log('Sending purchase order email:', id, emailData);
      const response = await api.post(`/purchase-orders/${id}/send-email`, emailData);
      console.log('Send PO email response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending purchase order email:', error);
      throw error;
    }
  },

  // Download purchase order as PDF
  downloadPurchaseOrder: async (id: string): Promise<Blob> => {
    try {
      console.log('Downloading purchase order PDF:', id);
      const response = await api.get(`/purchase-orders/${id}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading purchase order:', error);
      throw error;
    }
  },

  // ===== HELPER METHODS =====

  // Calculate totals for a purchase order
  calculateTotals: (products: ProductLine[], additionalDiscount?: { type: 'percentage' | 'amount', value: number }, shippingCharges?: { type: 'percentage' | 'amount', value: number }, gstRate: number = 5, isIntraState: boolean = false) => {
    // Calculate subtotal and product-level discounts
    let subTotal = 0;
    let productLevelDiscount = 0;

    products.forEach(product => {
      const qty = (product.quantity || 1) - (product.foc || 0);
      const baseAmount = qty * (product.unitPrice || 0);
      
      let discount = 0;
      if (product.discount && product.discount > 0) {
        if (product.discountType === 'percentage') {
          discount = (baseAmount * product.discount) / 100;
        } else {
          discount = product.discount;
        }
      }
      
      productLevelDiscount += discount;
      const lineTotal = baseAmount - discount;
      subTotal += lineTotal;
    });

    // Apply additional discount
    let additionalDiscountAmount = 0;
    if (additionalDiscount && additionalDiscount.value > 0) {
      if (additionalDiscount.type === 'percentage') {
        additionalDiscountAmount = (subTotal * additionalDiscount.value) / 100;
      } else {
        additionalDiscountAmount = additionalDiscount.value;
      }
    }

    const afterDiscount = subTotal - additionalDiscountAmount;

    // Calculate GST
    const gstAmount = (afterDiscount * gstRate) / 100;
    let cgst = 0, sgst = 0, igst = 0;

    if (isIntraState) {
      cgst = gstAmount / 2;
      sgst = gstAmount / 2;
    } else {
      igst = gstAmount;
    }

    // Calculate shipping charges
    let shippingAmount = 0;
    if (shippingCharges && shippingCharges.value > 0) {
      if (shippingCharges.type === 'percentage') {
        shippingAmount = (afterDiscount * shippingCharges.value) / 100;
      } else {
        shippingAmount = shippingCharges.value;
      }
    }

    // Grand total
    const grandTotal = afterDiscount + gstAmount + shippingAmount;

    return {
      subTotal: Math.round(subTotal * 100) / 100,
      productLevelDiscount: Math.round(productLevelDiscount * 100) / 100,
      additionalDiscountAmount: Math.round(additionalDiscountAmount * 100) / 100,
      afterDiscount: Math.round(afterDiscount * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      shippingAmount: Math.round(shippingAmount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100
    };
  },

  // Format currency
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  },

  // Format date
  formatDate: (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  // Get status badge color
  getStatusBadgeColor: (status: string): string => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'ordered':
        return 'bg-blue-100 text-blue-800';
      case 'partial_received':
        return 'bg-orange-100 text-orange-800';
      case 'received':
        return 'bg-purple-100 text-purple-800';
      case 'qc_pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'qc_passed':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'qc_failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  },

  // Get status label
  getStatusLabel: (status: string): string => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'pending_approval':
        return 'Pending Approval';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'ordered':
        return 'Ordered';
      case 'partial_received':
        return 'Partial Received';
      case 'received':
        return 'Received';
      case 'qc_pending':
        return 'QC Pending';
      case 'qc_passed':
        return 'QC Passed';
      case 'qc_failed':
        return 'QC Failed';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }
};

export default purchaseOrderAPI;