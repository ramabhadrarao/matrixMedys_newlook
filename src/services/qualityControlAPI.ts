// src/services/qualityControlAPI.ts
import api, { handleApiError } from './api';

export interface QCItemDetail {
  itemNumber: number;
  status: 'pending' | 'passed' | 'failed';
  qcReasons: string[];
  remarks: string;
  qcDate?: string;
  qcBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface QCProduct {
  product: string;
  productCode: string;
  productName: string;
  batchNo: string;
  mfgDate: string;
  expDate: string;
  receivedQty: number;
  qcQty: number;
  passedQty: number;
  failedQty: number;
  itemDetails: QCItemDetail[];
  overallStatus: 'pending' | 'in_progress' | 'passed' | 'failed' | 'partial_pass';
  qcSummary: {
    received_correctly: number;
    damaged_packaging: number;
    damaged_product: number;
    expired: number;
    near_expiry: number;
    wrong_product: number;
    quantity_mismatch: number;
    quality_issue: number;
    labeling_issue: number;
    other: number;
  };
}

export interface QualityControl {
  _id: string;
  qcNumber: string;
  invoiceReceiving: {
    _id: string;
    invoiceNumber: string;
    invoiceDate: string;
  };
  purchaseOrder: {
    _id: string;
    poNumber: string;
    poDate: string;
  };
  qcType: 'standard' | 'urgent' | 'special';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'pending_approval' | 'completed' | 'rejected';
  overallResult?: 'passed' | 'failed' | 'partial_pass';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  assignedTo: {
    _id: string;
    name: string;
    email: string;
  };
  products: QCProduct[];
  qcEnvironment: {
    temperature?: number;
    humidity?: number;
    lightCondition: 'normal' | 'bright' | 'dim';
  };
  qcDate?: string;
  qcBy?: {
    _id: string;
    name: string;
    email: string;
  };
  qcRemarks?: string;
  approvalDate?: string;
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  approvalRemarks?: string;
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

export interface QCFormData {
  qcType?: 'standard' | 'urgent' | 'special';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
}

export interface QCItemUpdateData {
  status: 'passed' | 'failed';
  qcReasons?: string[];
  remarks?: string;
}

export interface QCSubmissionData {
  qcRemarks?: string;
  qcEnvironment?: {
    temperature?: number;
    humidity?: number;
    lightCondition?: 'normal' | 'bright' | 'dim';
  };
}

export interface QCApprovalData {
  action: 'approve' | 'reject';
  approvalRemarks?: string;
}

export interface QCDashboardStats {
  statistics: {
    totalRecords: number;
    pendingRecords: number;
    inProgressRecords: number;
    completedRecords: number;
    rejectedRecords: number;
    totalProducts: number;
    passedProducts: number;
    failedProducts: number;
  };
  recentActivities: Array<{
    _id: string;
    qcNumber: string;
    status: string;
    assignedTo: { name: string };
    invoiceReceiving: { invoiceNumber: string };
    updatedAt: string;
    products: QCProduct[];
  }>;
  userPerformance: Array<{
    userName: string;
    totalProducts: number;
    passedProducts: number;
    passRate: number;
    avgProcessingHours: number;
  }>;
}

export interface QCStatistics {
  statusBreakdown: Array<{ _id: string; count: number }>;
  resultBreakdown: Array<{ _id: string; count: number }>;
  typeBreakdown: Array<{ _id: string; count: number }>;
  processingTime: {
    avgProcessingHours: number;
    minProcessingHours: number;
    maxProcessingHours: number;
  };
}

export const qualityControlAPI = {
  // Get QC records with pagination and filters
  getQCRecords: async (params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    status?: string;
    assignedTo?: string;
    priority?: string;
    qcType?: string;
  }) => {
    try {
      const response = await api.get('/quality-control', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get single QC record
  getQCRecord: async (id: string) => {
    try {
      const response = await api.get(`/quality-control/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Create QC record from invoice receiving
  createQCFromInvoice: async (invoiceReceivingId: string, data: QCFormData) => {
    try {
      const response = await api.post(`/quality-control/from-invoice/${invoiceReceivingId}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Update item-level QC details
  updateItemQC: async (qcId: string, productIndex: number, itemIndex: number, data: QCItemUpdateData) => {
    try {
      const response = await api.put(`/quality-control/${qcId}/product/${productIndex}/item/${itemIndex}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Submit QC for approval
  submitQCForApproval: async (id: string, data: QCSubmissionData) => {
    try {
      const response = await api.put(`/quality-control/${id}/submit`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Approve or reject QC
  approveRejectQC: async (id: string, data: QCApprovalData) => {
    try {
      const response = await api.put(`/quality-control/${id}/approve-reject`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Approve QC
  approveQC: async (id: string, approvalRemarks?: string) => {
    try {
      const response = await api.put(`/quality-control/${id}/approve`, { approvalRemarks });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Reject QC
  rejectQC: async (id: string, approvalRemarks?: string) => {
    try {
      const response = await api.put(`/quality-control/${id}/reject`, { approvalRemarks });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get QC dashboard statistics
  getQCDashboard: async (params?: { timeframe?: string; warehouse?: string }) => {
    try {
      const response = await api.get('/quality-control/dashboard', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Bulk assign QC records
  bulkAssignQC: async (data: { qcIds: string[]; assignedTo: string; priority?: string }) => {
    try {
      const response = await api.put('/quality-control/bulk-assign', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get QC workload for users
  getQCWorkload: async (params?: { userId?: string; status?: string }) => {
    try {
      const response = await api.get('/quality-control/workload', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get QC statistics
  getQCStatistics: async (params?: { dateFrom?: string; dateTo?: string }) => {
    try {
      const response = await api.get('/quality-control/statistics', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};