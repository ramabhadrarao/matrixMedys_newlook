// src/services/warehouseApprovalAPI.ts
import api, { handleApiError } from './api';

export interface WarehouseApprovalProduct {
  product: string;
  productCode: string;
  productName: string;
  batchNo: string;
  mfgDate: string;
  expDate: string;
  qcPassedQty: number;
  warehouseQty: number;
  approvedQty: number;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'partial_approved';
  warehouseDecision?: 'approved' | 'rejected' | 'partial_approved';
  warehouseRemarks?: string;
  warehouseDate?: string;
  warehouseBy?: {
    _id: string;
    name: string;
    email: string;
  };
  storageLocation?: {
    warehouse?: string;
    zone?: string;
    rack?: string;
    shelf?: string;
    bin?: string;
  };
}

export interface ManagerApproval {
  level: number;
  approvedBy: {
    _id: string;
    name: string;
    email: string;
  };
  approvalDate: string;
  action: 'approve' | 'reject';
  remarks: string;
}

export interface WarehouseApproval {
  _id: string;
  warehouseApprovalNumber: string;
  qualityControl: {
    _id: string;
    qcNumber: string;
    qcDate: string;
  };
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
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'pending_manager_approval' | 'completed' | 'rejected';
  overallResult?: 'approved' | 'rejected' | 'partial_approved';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  assignedTo: {
    _id: string;
    name: string;
    email: string;
  };
  products: WarehouseApprovalProduct[];
  environmentConditions?: {
    temperature?: number;
    humidity?: number;
    storageCondition?: string;
  };
  warehouseDate?: string;
  warehouseBy?: {
    _id: string;
    name: string;
    email: string;
  };
  warehouseRemarks?: string;
  managerApprovals: ManagerApproval[];
  finalApprovalDate?: string;
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

export interface WarehouseProductUpdateData {
  warehouseDecision: 'approved' | 'rejected' | 'partial_approved';
  warehouseRemarks?: string;
  approvedQty?: number;
  storageLocation?: {
    warehouse?: string;
    zone?: string;
    rack?: string;
    shelf?: string;
    bin?: string;
  };
}

export interface WarehouseSubmissionData {
  warehouseRemarks?: string;
  environmentConditions?: {
    temperature?: number;
    humidity?: number;
    storageCondition?: string;
  };
}

export interface ManagerApprovalData {
  action: 'approve' | 'reject';
  approvalLevel?: number;
  remarks?: string;
}

export interface WarehouseApprovalDashboardStats {
  statistics: {
    totalRecords: number;
    pendingRecords: number;
    inProgressRecords: number;
    completedRecords: number;
    approvedRecords: number;
    rejectedRecords: number;
    totalProducts: number;
    approvedProducts: number;
    rejectedProducts: number;
  };
  recentActivities: Array<{
    _id: string;
    waNumber: string;
    status: string;
    assignedTo: { name: string };
    invoiceReceiving: { invoiceNumber: string };
    updatedAt: string;
    products: WarehouseApprovalProduct[];
  }>;
  userPerformance: Array<{
    userName: string;
    totalProducts: number;
    approvedProducts: number;
    approvalRate: number;
    avgProcessingHours: number;
  }>;
}

export interface WarehouseApprovalStatistics {
  statusBreakdown: Array<{ _id: string; count: number }>;
  resultBreakdown: Array<{ _id: string; count: number }>;
  processingTime: {
    avgProcessingHours: number;
    minProcessingHours: number;
    maxProcessingHours: number;
  };
}

export const warehouseApprovalAPI = {
  // Get warehouse approval records with pagination and filters
  getWarehouseApprovals: async (params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    status?: string;
    priority?: string;
    assignedTo?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    try {
      const response = await api.get('/warehouse-approval', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get single warehouse approval record
  getWarehouseApproval: async (id: string) => {
    try {
      const response = await api.get(`/warehouse-approval/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Create warehouse approval from QC record
  createWarehouseApprovalFromQC: async (qcId: string, data?: { priority?: string; assignedTo?: string }) => {
    try {
      const response = await api.post(`/warehouse-approval/from-qc/${qcId}`, data || {});
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Update product warehouse check
  updateProductWarehouseCheck: async (
    warehouseApprovalId: string, 
    productIndex: number, 
    data: WarehouseProductUpdateData
  ) => {
    try {
      const response = await api.put(
        `/warehouse-approval/${warehouseApprovalId}/product/${productIndex}`, 
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Submit for manager approval
  submitForManagerApproval: async (id: string, data: WarehouseSubmissionData) => {
    try {
      const response = await api.put(`/warehouse-approval/${id}/submit`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Manager approval action
  managerApprovalAction: async (id: string, data: ManagerApprovalData) => {
    try {
      const response = await api.put(`/warehouse-approval/${id}/manager-approval`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Approve warehouse approval
  approveWarehouseApproval: async (id: string, data: { approvalLevel?: number; managerRemarks?: string }) => {
    try {
      const response = await api.put(`/warehouse-approval/${id}/approve`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Reject warehouse approval
  rejectWarehouseApproval: async (id: string, data: { approvalLevel?: number; managerRemarks?: string }) => {
    try {
      const response = await api.put(`/warehouse-approval/${id}/reject`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get warehouse approval dashboard statistics
  getWarehouseApprovalDashboard: async (params?: { timeframe?: string; warehouse?: string }) => {
    try {
      const response = await api.get('/warehouse-approval/dashboard', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Bulk assign warehouse approval records
  bulkAssignWarehouseApproval: async (data: { 
    warehouseApprovalIds: string[]; 
    assignedTo: string; 
    priority?: string 
  }) => {
    try {
      const response = await api.put('/warehouse-approval/bulk-assign', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get warehouse approval workload for users
  getWarehouseApprovalWorkload: async (params?: { userId?: string; status?: string }) => {
    try {
      const response = await api.get('/warehouse-approval/workload', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get warehouse approval statistics
  getWarehouseApprovalStatistics: async (params?: { dateFrom?: string; dateTo?: string }) => {
    try {
      const response = await api.get('/warehouse-approval/statistics', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};