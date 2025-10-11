// src/services/index.ts - Main service exports
export * from './api';
export * from './branchAPI';
export * from './categoryAPI';
export * from './dashboardAPI';
export * from './doctorAPI';
export * from './hospitalAPI';
export * from './inventoryAPI';
export * from './invoiceReceivingAPI';
export * from './principalAPI';
export * from './productAPI';
export * from './purchaseOrderAPI';
export * from './qualityControlAPI';
export * from './warehouseAPI';
export * from './warehouseApprovalAPI';
export * from './workflowAPI';

// Combined API object for convenience
import { authAPI, statesAPI, usersAPI, permissionsAPI, hospitalAPI, checkApiHealth } from './api';
import { branchAPI } from './branchAPI';
import { categoryAPI } from './categoryAPI';
import { dashboardAPI } from './dashboardAPI';
import { doctorAPI, portfolioAPI } from './doctorAPI';
import { inventoryAPI } from './inventoryAPI';
import { invoiceReceivingAPI } from './invoiceReceivingAPI';
import { principalAPI } from './principalAPI';
import { productAPI } from './productAPI';
import { purchaseOrderAPI } from './purchaseOrderAPI';
import { qualityControlAPI } from './qualityControlAPI';
import { warehouseAPI } from './warehouseAPI';
import { warehouseApprovalAPI } from './warehouseApprovalAPI';
import { workflowAPI } from './workflowAPI';

const API = {
  auth: authAPI,
  states: statesAPI,
  users: usersAPI,
  permissions: permissionsAPI,
  hospitals: hospitalAPI,
  branches: branchAPI,
  warehouses: warehouseAPI,
  dashboard: dashboardAPI,
  categories: categoryAPI,
  doctors: doctorAPI,
  portfolios: portfolioAPI,
  principals: principalAPI,
  products: productAPI,
  purchaseOrders: purchaseOrderAPI,
  invoiceReceiving: invoiceReceivingAPI,
  qualityControl: qualityControlAPI,
  warehouseApproval: warehouseApprovalAPI,
  inventory: inventoryAPI,
  workflow: workflowAPI,
  checkHealth: checkApiHealth
};

export default API;