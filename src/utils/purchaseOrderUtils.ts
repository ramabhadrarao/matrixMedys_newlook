// src/utils/purchaseOrderUtils.ts
import { PurchaseOrder, ProductLine } from '../services/purchaseOrderAPI';
import { InvoiceReceiving } from '../services/invoiceReceivingAPI';

// PO Status Constants
export const POStatus = {
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

export type POStatusType = typeof POStatus[keyof typeof POStatus];

// PO Status Colors for UI
export const POStatusColors: Record<POStatusType, string> = {
  [POStatus.DRAFT]: 'gray',
  [POStatus.PENDING_APPROVAL]: 'yellow',
  [POStatus.APPROVED]: 'green',
  [POStatus.REJECTED]: 'red',
  [POStatus.ORDERED]: 'blue',
  [POStatus.PARTIAL_RECEIVED]: 'orange',
  [POStatus.RECEIVED]: 'indigo',
  [POStatus.QC_PENDING]: 'purple',
  [POStatus.QC_PASSED]: 'green',
  [POStatus.QC_FAILED]: 'red',
  [POStatus.COMPLETED]: 'green',
  [POStatus.CANCELLED]: 'gray'
};

// PO Status Labels for Display
export const POStatusLabels: Record<POStatusType, string> = {
  [POStatus.DRAFT]: 'Draft',
  [POStatus.PENDING_APPROVAL]: 'Pending Approval',
  [POStatus.APPROVED]: 'Approved',
  [POStatus.REJECTED]: 'Rejected',
  [POStatus.ORDERED]: 'Ordered',
  [POStatus.PARTIAL_RECEIVED]: 'Partially Received',
  [POStatus.RECEIVED]: 'Received',
  [POStatus.QC_PENDING]: 'QC Pending',
  [POStatus.QC_PASSED]: 'QC Passed',
  [POStatus.QC_FAILED]: 'QC Failed',
  [POStatus.COMPLETED]: 'Completed',
  [POStatus.CANCELLED]: 'Cancelled'
};

// Workflow Stage Codes
export const WorkflowStageCodes = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED_L1: 'APPROVED_L1',
  APPROVED_FINAL: 'APPROVED_FINAL',
  ORDERED: 'ORDERED',
  PARTIAL_RECEIVED: 'PARTIAL_RECEIVED',
  RECEIVED: 'RECEIVED',
  QC_PENDING: 'QC_PENDING',
  QC_PASSED: 'QC_PASSED',
  QC_FAILED: 'QC_FAILED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const;

// Workflow Actions
export const WorkflowActions = {
  EDIT: 'edit',
  APPROVE: 'approve',
  REJECT: 'reject',
  RETURN: 'return',
  CANCEL: 'cancel',
  RECEIVE: 'receive',
  QC_CHECK: 'qc_check',
  COMPLETE: 'complete'
} as const;

export type WorkflowActionType = typeof WorkflowActions[keyof typeof WorkflowActions];

// QC Status Constants
export const QCStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  PASSED: 'passed',
  FAILED: 'failed',
  PARTIAL_PASS: 'partial_pass'
} as const;

export type QCStatusType = typeof QCStatus[keyof typeof QCStatus];

// QC Status Colors
export const QCStatusColors: Record<QCStatusType, string> = {
  [QCStatus.PENDING]: 'yellow',
  [QCStatus.IN_PROGRESS]: 'blue',
  [QCStatus.PASSED]: 'green',
  [QCStatus.FAILED]: 'red',
  [QCStatus.PARTIAL_PASS]: 'orange'
};

// QC Status Labels
export const QCStatusLabels: Record<QCStatusType, string> = {
  [QCStatus.PENDING]: 'QC Pending',
  [QCStatus.IN_PROGRESS]: 'QC In Progress',
  [QCStatus.PASSED]: 'QC Passed',
  [QCStatus.FAILED]: 'QC Failed',
  [QCStatus.PARTIAL_PASS]: 'Partially Passed'
};

// Tax Types
export const TaxTypes = {
  IGST: 'IGST',
  CGST_SGST: 'CGST_SGST'
} as const;

export type TaxType = typeof TaxTypes[keyof typeof TaxTypes];

// Discount Types
export const DiscountTypes = {
  PERCENTAGE: 'percentage',
  AMOUNT: 'amount'
} as const;

export type DiscountType = typeof DiscountTypes[keyof typeof DiscountTypes];

// Product Status in Receiving
export const ProductReceivingStatus = {
  RECEIVED: 'received',
  BACKLOG: 'backlog',
  DAMAGED: 'damaged',
  REJECTED: 'rejected'
} as const;

export type ProductReceivingStatusType = typeof ProductReceivingStatus[keyof typeof ProductReceivingStatus];

// Calculate PO Totals
export interface POTotals {
  subTotal: number;
  productLevelDiscount: number;
  totalAfterDiscount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstAmount: number;
  shippingAmount: number;
  grandTotal: number;
}

export const calculatePOTotals = (
  products: ProductLine[],
  additionalDiscount?: { type: DiscountType; value: number },
  shippingCharges?: { type: DiscountType; value: number },
  taxType: TaxType = 'IGST',
  gstRate: number = 5
): POTotals => {
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
  if (additionalDiscount && additionalDiscount.value > 0) {
    if (additionalDiscount.type === 'percentage') {
      totalAfterDiscount -= (totalAfterDiscount * additionalDiscount.value / 100);
    } else {
      totalAfterDiscount -= additionalDiscount.value;
    }
  }
  
  // Calculate GST
  const gstAmount = totalAfterDiscount * (gstRate / 100);
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  
  if (taxType === 'CGST_SGST') {
    cgst = gstAmount / 2;
    sgst = gstAmount / 2;
  } else {
    igst = gstAmount;
  }
  
  // Add shipping charges
  let shippingAmount = 0;
  if (shippingCharges && shippingCharges.value > 0) {
    if (shippingCharges.type === 'percentage') {
      shippingAmount = totalAfterDiscount * (shippingCharges.value / 100);
    } else {
      shippingAmount = shippingCharges.value;
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
};

// Format PO Number
export const formatPONumber = (poNumber: string): string => {
  // Format: MM-BIO-250324/001
  const parts = poNumber.split('/');
  if (parts.length === 2) {
    const [prefix, serial] = parts;
    return `${prefix}/${serial.padStart(3, '0')}`;
  }
  return poNumber;
};

// Get Next Workflow Stage
export const getNextWorkflowStage = (currentStage: string, action: WorkflowActionType): string | null => {
  const stageTransitions: Record<string, Partial<Record<WorkflowActionType, string>>> = {
    DRAFT: {
      approve: 'PENDING_APPROVAL',
      cancel: 'CANCELLED'
    },
    PENDING_APPROVAL: {
      approve: 'APPROVED_L1',
      reject: 'CANCELLED',
      return: 'DRAFT'
    },
    APPROVED_L1: {
      approve: 'APPROVED_FINAL',
      reject: 'CANCELLED',
      return: 'PENDING_APPROVAL'
    },
    APPROVED_FINAL: {
      approve: 'ORDERED'
    },
    ORDERED: {
      receive: 'PARTIAL_RECEIVED'
    },
    PARTIAL_RECEIVED: {
      receive: 'RECEIVED'
    },
    RECEIVED: {
      qc_check: 'QC_PENDING'
    },
    QC_PENDING: {
      approve: 'QC_PASSED',
      reject: 'QC_FAILED'
    },
    QC_PASSED: {
      complete: 'COMPLETED'
    },
    QC_FAILED: {
      return: 'ORDERED',
      cancel: 'CANCELLED'
    }
  };
  
  return stageTransitions[currentStage]?.[action] || null;
};

// Check if user can perform action
export const canPerformAction = (
  currentStage: string,
  action: WorkflowActionType,
  userPermissions: string[]
): boolean => {
  const requiredPermissions: Record<string, Partial<Record<WorkflowActionType, string>>> = {
    DRAFT: {
      edit: 'purchase_orders.update',
      approve: 'purchase_orders.create',
      cancel: 'purchase_orders.delete'
    },
    PENDING_APPROVAL: {
      approve: 'po_workflow.approve_level1',
      reject: 'po_workflow.reject',
      return: 'po_workflow.return'
    },
    APPROVED_L1: {
      approve: 'po_workflow.approve_level2',
      reject: 'po_workflow.reject',
      return: 'po_workflow.return'
    },
    APPROVED_FINAL: {
      approve: 'po_workflow.approve_final',
      edit: 'purchase_orders.update'
    },
    ORDERED: {
      receive: 'po_receiving.receive'
    },
    RECEIVED: {
      qc_check: 'po_receiving.qc_check'
    },
    QC_PENDING: {
      qc_check: 'po_receiving.qc_approve'
    }
  };
  
  const requiredPermission = requiredPermissions[currentStage]?.[action];
  return requiredPermission ? userPermissions.includes(requiredPermission) : false;
};

// Get available actions for stage
export const getAvailableActions = (
  currentStage: string,
  userPermissions: string[]
): WorkflowActionType[] => {
  const stageActions: Record<string, WorkflowActionType[]> = {
    DRAFT: ['edit', 'approve', 'cancel'],
    PENDING_APPROVAL: ['approve', 'reject', 'return'],
    APPROVED_L1: ['approve', 'reject', 'return'],
    APPROVED_FINAL: ['approve', 'edit'],
    ORDERED: ['receive'],
    PARTIAL_RECEIVED: ['receive'],
    RECEIVED: ['qc_check'],
    QC_PENDING: ['qc_check'],
    QC_PASSED: ['complete'],
    QC_FAILED: ['return', 'cancel'],
    COMPLETED: [],
    CANCELLED: []
  };
  
  const availableActions = stageActions[currentStage] || [];
  return availableActions.filter(action => canPerformAction(currentStage, action, userPermissions));
};

// Validate PO Form
export interface POValidationError {
  field: string;
  message: string;
}

export const validatePOForm = (data: any): POValidationError[] => {
  const errors: POValidationError[] = [];
  
  // Required fields
  if (!data.principal) {
    errors.push({ field: 'principal', message: 'Principal is required' });
  }
  
  if (!data.billTo?.branchWarehouse) {
    errors.push({ field: 'billTo.branchWarehouse', message: 'Bill to branch/warehouse is required' });
  }
  
  if (!data.billTo?.name) {
    errors.push({ field: 'billTo.name', message: 'Bill to name is required' });
  }
  
  if (!data.shipTo?.branchWarehouse) {
    errors.push({ field: 'shipTo.branchWarehouse', message: 'Ship to branch/warehouse is required' });
  }
  
  if (!data.products || data.products.length === 0) {
    errors.push({ field: 'products', message: 'At least one product is required' });
  }
  
  // Validate each product
  data.products?.forEach((product: any, index: number) => {
    if (!product.product) {
      errors.push({ field: `products[${index}].product`, message: `Product ${index + 1}: Product is required` });
    }
    
    if (!product.quantity || product.quantity <= 0) {
      errors.push({ field: `products[${index}].quantity`, message: `Product ${index + 1}: Valid quantity is required` });
    }
    
    if (!product.unitPrice || product.unitPrice <= 0) {
      errors.push({ field: `products[${index}].unitPrice`, message: `Product ${index + 1}: Valid unit price is required` });
    }
    
    if (product.foc && product.foc >= product.quantity) {
      errors.push({ field: `products[${index}].foc`, message: `Product ${index + 1}: FOC cannot be greater than or equal to quantity` });
    }
    
    if (product.discount && product.discount.value < 0) {
      errors.push({ field: `products[${index}].discount`, message: `Product ${index + 1}: Discount cannot be negative` });
    }
    
    if (product.discount && product.discount.type === 'percentage' && product.discount.value > 100) {
      errors.push({ field: `products[${index}].discount`, message: `Product ${index + 1}: Percentage discount cannot exceed 100%` });
    }
  });
  
  // Email validation
  if (!data.toEmails || data.toEmails.length === 0) {
    errors.push({ field: 'toEmails', message: 'At least one recipient email is required' });
  }
  
  // GST validation
  if (data.gstRate && (data.gstRate < 0 || data.gstRate > 100)) {
    errors.push({ field: 'gstRate', message: 'GST rate must be between 0 and 100' });
  }
  
  // Additional discount validation
  if (data.additionalDiscount) {
    if (data.additionalDiscount.value < 0) {
      errors.push({ field: 'additionalDiscount', message: 'Additional discount cannot be negative' });
    }
    
    if (data.additionalDiscount.type === 'percentage' && data.additionalDiscount.value > 100) {
      errors.push({ field: 'additionalDiscount', message: 'Percentage discount cannot exceed 100%' });
    }
  }
  
  // Shipping charges validation
  if (data.shippingCharges) {
    if (data.shippingCharges.value < 0) {
      errors.push({ field: 'shippingCharges', message: 'Shipping charges cannot be negative' });
    }
    
    if (data.shippingCharges.type === 'percentage' && data.shippingCharges.value > 100) {
      errors.push({ field: 'shippingCharges', message: 'Percentage shipping charges cannot exceed 100%' });
    }
  }
  
  return errors;
};

// Calculate backlog from PO and receivings
export const calculateBacklog = (
  purchaseOrder: PurchaseOrder,
  invoiceReceivings: InvoiceReceiving[]
): Record<string, number> => {
  const backlog: Record<string, number> = {};
  
  // Initialize with ordered quantities
  purchaseOrder.products.forEach(product => {
    backlog[product.product] = product.quantity;
  });
  
  // Subtract received quantities
  invoiceReceivings.forEach(receiving => {
    receiving.products.forEach(product => {
      if (product.status === 'received' && backlog[product.product]) {
        backlog[product.product] -= product.receivedQty;
      }
    });
  });
  
  // Remove items with no backlog
  Object.keys(backlog).forEach(productId => {
    if (backlog[productId] <= 0) {
      delete backlog[productId];
    }
  });
  
  return backlog;
};

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Format date
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Format date time
export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get status badge class
export const getStatusBadgeClass = (status: POStatusType): string => {
  const color = POStatusColors[status];
  return `badge badge-${color}`;
};

// Check if PO is editable
export const isPOEditable = (status: POStatusType): boolean => {
  return status === POStatus.DRAFT;
};

// Check if PO can be deleted
export const isPODeletable = (status: POStatusType): boolean => {
  return status === POStatus.DRAFT;
};

// Check if PO can be cancelled
export const isPOCancellable = (status: POStatusType): boolean => {
  return [
    POStatus.DRAFT,
    POStatus.PENDING_APPROVAL,
    POStatus.APPROVED,
    POStatus.ORDERED
  ].includes(status);
};

// Generate email template for PO
export const generatePOEmailTemplate = (purchaseOrder: PurchaseOrder): string => {
  return `
Dear Supplier,

Please find the purchase order details below:

PO Number: ${purchaseOrder.poNumber}
Date: ${formatDate(purchaseOrder.poDate)}
Total Amount: ${formatCurrency(purchaseOrder.grandTotal)}

Please confirm receipt and expected delivery date.

Best regards,
${purchaseOrder.billTo.name}
  `.trim();
};

export default {
  POStatus,
  POStatusColors,
  POStatusLabels,
  WorkflowStageCodes,
  WorkflowActions,
  QCStatus,
  QCStatusColors,
  QCStatusLabels,
  TaxTypes,
  DiscountTypes,
  ProductReceivingStatus,
  calculatePOTotals,
  formatPONumber,
  getNextWorkflowStage,
  canPerformAction,
  getAvailableActions,
  validatePOForm,
  calculateBacklog,
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusBadgeClass,
  isPOEditable,
  isPODeletable,
  isPOCancellable,
  generatePOEmailTemplate
};