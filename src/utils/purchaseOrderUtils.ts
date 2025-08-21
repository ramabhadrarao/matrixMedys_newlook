// src/utils/purchaseOrderUtils.ts - PO utility functions
import { PurchaseOrder, ProductLine } from '../services/purchaseOrderAPI';

// PO Status Constants
export const PO_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ORDERED: 'ordered',
  PARTIAL_RECEIVED: 'partial_received',
  RECEIVED: 'received',
  QC_PENDING: 'qc_pending',
  QC_PASSED: 'qc_passed',
  QC_FAILED: 'qc_failed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

// Status color mappings
export const PO_STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  pending_approval: 'yellow',
  approved: 'blue',
  rejected: 'red',
  ordered: 'indigo',
  partial_received: 'orange',
  received: 'green',
  qc_pending: 'purple',
  qc_passed: 'emerald',
  qc_failed: 'rose',
  completed: 'teal',
  cancelled: 'gray'
};

// Status display labels
export const PO_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  ordered: 'Ordered',
  partial_received: 'Partially Received',
  received: 'Received',
  qc_pending: 'QC Pending',
  qc_passed: 'QC Passed',
  qc_failed: 'QC Failed',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

// Workflow action labels
export const WORKFLOW_ACTIONS = {
  EDIT: 'edit',
  APPROVE: 'approve',
  REJECT: 'reject',
  RETURN: 'return',
  CANCEL: 'cancel',
  RECEIVE: 'receive',
  QC_CHECK: 'qc_check'
} as const;

// Tax types
export const TAX_TYPES = {
  IGST: 'IGST',
  CGST_SGST: 'CGST_SGST'
} as const;

// Units of measurement
export const UNITS = [
  'PCS', 'BOX', 'KG', 'GM', 'LTR', 'ML', 'MTR', 'CM', 'DOZEN', 'PACK'
] as const;

// Validation functions
export const poValidation = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidGSTIN: (gstin: string): boolean => {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin.toUpperCase());
  },

  isValidPincode: (pincode: string): boolean => {
    return /^[0-9]{6}$/.test(pincode);
  },

  isValidMobile: (mobile: string): boolean => {
    return /^[6-9]\d{9}$/.test(mobile);
  },

  validateProductLine: (product: ProductLine): string[] => {
    const errors: string[] = [];
    
    if (product.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }
    
    if (product.unitPrice < 0) {
      errors.push('Unit price cannot be negative');
    }
    
    if (product.foc && product.foc < 0) {
      errors.push('FOC quantity cannot be negative');
    }
    
    if (product.foc && product.foc > product.quantity) {
      errors.push('FOC quantity cannot exceed ordered quantity');
    }
    
    if (product.discount) {
      if (product.discount.value < 0) {
        errors.push('Discount value cannot be negative');
      }
      if (product.discount.type === 'percentage' && product.discount.value > 100) {
        errors.push('Percentage discount cannot exceed 100%');
      }
    }
    
    return errors;
  },

  validatePO: (po: Partial<PurchaseOrder>): string[] => {
    const errors: string[] = [];
    
    if (!po.principal) {
      errors.push('Principal is required');
    }
    
    if (!po.billTo?.branchWarehouse) {
      errors.push('Bill to branch/warehouse is required');
    }
    
    if (!po.shipTo?.branchWarehouse) {
      errors.push('Ship to branch/warehouse is required');
    }
    
    if (!po.products || po.products.length === 0) {
      errors.push('At least one product is required');
    }
    
    if (!po.toEmails || po.toEmails.length === 0) {
      errors.push('At least one recipient email is required');
    }
    
    return errors;
  }
};

// Calculation utilities
export const poCalculations = {
  calculateProductTotal: (product: ProductLine): number => {
    const effectiveQty = product.quantity - (product.foc || 0);
    let total = effectiveQty * product.unitPrice;
    
    if (product.discount && product.discount.value > 0) {
      if (product.discount.type === 'percentage') {
        total -= (total * product.discount.value / 100);
      } else {
        total -= product.discount.value;
      }
    }
    
    return total;
  },

  calculateSubTotal: (products: ProductLine[]): number => {
    return products.reduce((sum, product) => {
      return sum + poCalculations.calculateProductTotal(product);
    }, 0);
  },

  calculateTax: (amount: number, gstRate: number, taxType: string): {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  } => {
    const taxAmount = amount * (gstRate / 100);
    
    if (taxType === 'CGST_SGST') {
      return {
        cgst: taxAmount / 2,
        sgst: taxAmount / 2,
        igst: 0,
        total: taxAmount
      };
    } else {
      return {
        cgst: 0,
        sgst: 0,
        igst: taxAmount,
        total: taxAmount
      };
    }
  },

  calculateShipping: (amount: number, shippingCharges?: { type: string; value: number }): number => {
    if (!shippingCharges || shippingCharges.value <= 0) {
      return 0;
    }
    
    if (shippingCharges.type === 'percentage') {
      return amount * (shippingCharges.value / 100);
    } else {
      return shippingCharges.value;
    }
  },

  calculateBacklog: (product: ProductLine): number => {
    const receivedQty = product.receivedQty || 0;
    return Math.max(0, product.quantity - receivedQty);
  },

  getReceivingProgress: (po: PurchaseOrder): {
    percentage: number;
    received: number;
    total: number;
    backlog: number;
  } => {
    const totalQty = po.products.reduce((sum, p) => sum + p.quantity, 0);
    const receivedQty = po.products.reduce((sum, p) => sum + (p.receivedQty || 0), 0);
    const backlogQty = totalQty - receivedQty;
    
    return {
      percentage: totalQty > 0 ? (receivedQty / totalQty) * 100 : 0,
      received: receivedQty,
      total: totalQty,
      backlog: backlogQty
    };
  }
};

// Formatting utilities
export const poFormatters = {
  formatPONumber: (poNumber: string): string => {
    return poNumber.toUpperCase();
  },

  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  },

  formatDate: (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  formatDateTime: (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  formatQuantity: (qty: number, unit: string = 'PCS'): string => {
    return `${qty} ${unit}`;
  },

  formatPercentage: (value: number): string => {
    return `${value.toFixed(2)}%`;
  },

  getStatusBadgeColor: (status: string): string => {
    return PO_STATUS_COLORS[status] || 'gray';
  },

  getStatusLabel: (status: string): string => {
    return PO_STATUS_LABELS[status] || status;
  }
};

// Workflow utilities
export const workflowUtils = {
  canEdit: (po: PurchaseOrder): boolean => {
    return po.status === PO_STATUS.DRAFT || 
           (po.currentStage?.allowedActions?.includes(WORKFLOW_ACTIONS.EDIT) ?? false);
  },

  canApprove: (po: PurchaseOrder): boolean => {
    return po.currentStage?.allowedActions?.includes(WORKFLOW_ACTIONS.APPROVE) ?? false;
  },

  canReject: (po: PurchaseOrder): boolean => {
    return po.currentStage?.allowedActions?.includes(WORKFLOW_ACTIONS.REJECT) ?? false;
  },

  canCancel: (po: PurchaseOrder): boolean => {
    return po.currentStage?.allowedActions?.includes(WORKFLOW_ACTIONS.CANCEL) ?? false;
  },

  canReceive: (po: PurchaseOrder): boolean => {
    return po.status === PO_STATUS.ORDERED || 
           po.status === PO_STATUS.PARTIAL_RECEIVED;
  },

  canPerformQC: (po: PurchaseOrder): boolean => {
    return po.status === PO_STATUS.QC_PENDING;
  },

  getNextAction: (po: PurchaseOrder): string | null => {
    if (po.status === PO_STATUS.DRAFT) return 'Submit for Approval';
    if (po.status === PO_STATUS.PENDING_APPROVAL) return 'Approve/Reject';
    if (po.status === PO_STATUS.APPROVED) return 'Send Order';
    if (po.status === PO_STATUS.ORDERED) return 'Receive Items';
    if (po.status === PO_STATUS.RECEIVED) return 'Submit for QC';
    if (po.status === PO_STATUS.QC_PENDING) return 'Perform QC Check';
    if (po.status === PO_STATUS.QC_PASSED) return 'Complete';
    return null;
  }
};

// Export utilities
export const exportUtils = {
  exportToCSV: (data: PurchaseOrder[]): string => {
    const headers = [
      'PO Number',
      'Date',
      'Principal',
      'Status',
      'Total Items',
      'Grand Total',
      'Created By'
    ];
    
    const rows = data.map(po => [
      po.poNumber,
      poFormatters.formatDate(po.poDate),
      typeof po.principal === 'object' ? po.principal.name : '',
      poFormatters.getStatusLabel(po.status),
      po.products.length.toString(),
      poFormatters.formatCurrency(po.grandTotal),
      po.createdBy.name
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
  },

  downloadCSV: (data: PurchaseOrder[], filename: string = 'purchase-orders.csv'): void => {
    const csvContent = exportUtils.exportToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Default export
export default {
  status: PO_STATUS,
  colors: PO_STATUS_COLORS,
  labels: PO_STATUS_LABELS,
  actions: WORKFLOW_ACTIONS,
  taxTypes: TAX_TYPES,
  units: UNITS,
  validation: poValidation,
  calculations: poCalculations,
  formatters: poFormatters,
  workflow: workflowUtils,
  export: exportUtils
};