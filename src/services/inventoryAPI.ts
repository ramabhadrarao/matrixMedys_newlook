// src/services/inventoryAPI.ts
import api from './api';

// Interfaces
export interface InventoryLocation {
  zone: string;
  rack: string;
  shelf: string;
  bin: string;
}

export interface StockMovement {
  _id?: string;
  movementType: 'inward' | 'outward' | 'adjustment' | 'transfer' | 'reservation' | 'utilization';
  quantity: number;
  fromLocation?: InventoryLocation & { warehouse: string };
  toLocation?: InventoryLocation & { warehouse: string };
  reason: string;
  remarks?: string;
  movementDate: Date;
  movementBy: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
}

export interface ProductHistory {
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  purchaseOrderDate?: Date;
  supplierId?: string;
  supplierName?: string;
  invoiceReceivingId?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  receivedDate?: Date;
  receivedBy?: string;
  receivedQty?: number;
  qualityControlId?: string;
  qualityControlNumber?: string;
  qualityControlDate?: Date;
  qcApprovedBy?: string;
  qcApprovedQty?: number;
  qcStatus?: string;
  warehouseApprovalId?: string;
  warehouseApprovalNumber?: string;
  warehouseApprovalDate?: Date;
  warehouseApprovedBy?: string;
  warehouseApprovedQty?: number;
  storageLocation?: InventoryLocation;
  utilization?: Array<{
    utilizationDate: Date;
    utilizationType: string;
    quantity: number;
    utilizationBy: string;
    remarks?: string;
  }>;
}

export interface InventoryRecord {
  _id: string;
  product: string;
  productCode: string;
  productName: string;
  batchNo: string;
  mfgDate: Date;
  expDate: Date;
  warehouse: string;
  location: InventoryLocation;
  currentStock: number;
  availableStock: number;
  reservedStock: number;
  minimumStock: number;
  maximumStock: number;
  unitCost: number;
  totalValue: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked';
  storageConditions?: string;
  productHistory: ProductHistory;
  stockMovements: StockMovement[];
  isActive: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields
  needsReorder?: boolean;
  stockValue?: number;
  daysUntilExpiry?: number;
  expiryStatus?: 'expired' | 'near_expiry' | 'expiring_soon' | 'good';
}

export interface InventoryFilters {
  warehouse?: string;
  product?: string;
  stockStatus?: string;
  expiryStatus?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  lowStock?: boolean;
  nearExpiry?: boolean;
}

export interface InventoryUpdateData {
  minimumStock?: number;
  maximumStock?: number;
  location?: InventoryLocation;
  storageConditions?: string;
}

export interface StockAdjustmentData {
  adjustmentType: 'increase' | 'decrease' | 'set';
  quantity: number;
  reason: string;
  remarks?: string;
}

export interface StockReservationData {
  quantity: number;
  reason: string;
  remarks?: string;
  reservationExpiry?: Date;
}

export interface StockTransferData {
  toWarehouse?: string;
  toLocation?: InventoryLocation;
  quantity: number;
  reason?: string;
  remarks?: string;
  referenceNumber?: string;
}

export interface StockUtilizationData {
  quantity: number;
  utilizationType: string;
  reason: string;
  remarks?: string;
  utilizationDate?: Date;
}

export interface InventoryStatistics {
  overview: {
    totalValue: number;
    totalItems: number;
    totalStock: number;
  };
  stockStatusBreakdown: Array<{
    _id: string;
    count: number;
    totalStock: number;
    totalValue: number;
  }>;
  alerts: {
    lowStock: number;
    nearExpiry: number;
    expired: number;
  };
  topProductsByValue: Array<{
    _id: string;
    productName: string;
    totalValue: number;
    totalStock: number;
  }>;
  warehouseBreakdown: Array<{
    _id: string;
    warehouseName: string;
    totalItems: number;
    totalStock: number;
    totalValue: number;
  }>;
}

export interface InventoryDashboardStats {
  statistics: {
    totalItems: number;
    totalValue: number;
    totalStock: number;
    availableStock: number;
    reservedStock: number;
    lowStockItems: number;
    outOfStockItems: number;
    nearExpiryItems: number;
    expiredItems: number;
  };
  recentMovements: Array<{
    _id: string;
    productName: string;
    productCode: string;
    currentStock: number;
    stockMovements: StockMovement[];
    warehouse: {
      _id: string;
      name: string;
    };
  }>;
  topProductsByValue: Array<{
    _id: string;
    productName: string;
    productCode: string;
    currentStock: number;
    totalValue: number;
    warehouse: {
      _id: string;
      name: string;
    };
  }>;
  warehouseDistribution: Array<{
    _id: string;
    warehouseName: string;
    totalItems: number;
    totalValue: number;
    totalStock: number;
  }>;
}

export interface InventoryAlerts {
  lowStock: Array<{
    _id: string;
    productName: string;
    productCode: string;
    availableStock: number;
    minimumStock: number;
    warehouse: {
      _id: string;
      name: string;
    };
  }>;
  outOfStock: Array<{
    _id: string;
    productName: string;
    productCode: string;
    availableStock: number;
    warehouse: {
      _id: string;
      name: string;
    };
  }>;
  nearExpiry: Array<{
    _id: string;
    productName: string;
    productCode: string;
    expDate: Date;
    daysUntilExpiry: number;
    warehouse: {
      _id: string;
      name: string;
    };
  }>;
  expired: Array<{
    _id: string;
    productName: string;
    productCode: string;
    expDate: Date;
    warehouse: {
      _id: string;
      name: string;
    };
  }>;
}

export interface InventoryValuation {
  overallTotals: {
    totalItems: number;
    totalStock: number;
    totalValue: number;
    availableStock: number;
    availableValue: number;
    reservedStock: number;
    reservedValue: number;
  };
  warehouseValuation: Array<{
    _id: string;
    warehouseName: string;
    totalItems: number;
    totalStock: number;
    totalValue: number;
    availableValue: number;
    reservedValue: number;
  }>;
  categoryValuation: Array<{
    _id: string;
    categoryName: string;
    totalItems: number;
    totalStock: number;
    totalValue: number;
    availableValue: number;
    reservedValue: number;
  }>;
}

// API Methods
export const inventoryAPI = {
  // Get inventory records with filtering and pagination
  getInventoryRecords: async (filters: InventoryFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/inventory?${params.toString()}`);
    return response.data;
  },

  // Get single inventory record by ID
  getInventoryRecord: async (id: string) => {
    const response = await api.get(`/inventory/${id}`);
    return response.data;
  },

  // Update inventory record
  updateInventoryRecord: async (id: string, data: InventoryUpdateData) => {
    const response = await api.put(`/inventory/${id}`, data);
    return response.data;
  },

  // Adjust stock levels
  adjustStock: async (id: string, data: StockAdjustmentData) => {
    const response = await api.post(`/inventory/${id}/adjust`, data);
    return response.data;
  },

  // Reserve stock
  reserveStock: async (id: string, data: StockReservationData) => {
    const response = await api.post(`/inventory/${id}/reserve`, data);
    return response.data;
  },

  // Release stock reservation
  releaseReservation: async (id: string, data: { quantity: number; reason?: string; remarks?: string }) => {
    const response = await api.post(`/inventory/${id}/release-reservation`, data);
    return response.data;
  },

  // Transfer stock between locations/warehouses
  transferStock: async (id: string, data: StockTransferData) => {
    const response = await api.post(`/inventory/${id}/transfer`, data);
    return response.data;
  },

  // Record stock utilization
  recordUtilization: async (id: string, data: StockUtilizationData) => {
    const response = await api.post(`/inventory/${id}/utilize`, data);
    return response.data;
  },

  // Get inventory statistics
  getInventoryStatistics: async (filters: { warehouse?: string; dateFrom?: string; dateTo?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/inventory/statistics?${params.toString()}`);
    return response.data as { data: InventoryStatistics };
  },

  // Get stock movement history
  getStockMovementHistory: async (filters: { 
    inventoryId?: string; 
    warehouse?: string; 
    movementType?: string; 
    dateFrom?: string; 
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/inventory/movements?${params.toString()}`);
    return response.data;
  },

  // Get inventory dashboard statistics
  getInventoryDashboard: async (filters: { timeframe?: string; warehouse?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/inventory/dashboard?${params.toString()}`);
    return response.data as { success: boolean; data: InventoryDashboardStats };
  },

  // Get inventory alerts
  getInventoryAlerts: async (filters: { warehouse?: string; alertType?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/inventory/alerts?${params.toString()}`);
    return response.data as { success: boolean; data: InventoryAlerts };
  },

  // Get inventory valuation report
  getInventoryValuation: async (filters: { 
    warehouse?: string; 
    category?: string; 
    dateFrom?: string; 
    dateTo?: string; 
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/inventory/valuation?${params.toString()}`);
    return response.data as { success: boolean; data: InventoryValuation };
  }
};

export default inventoryAPI;