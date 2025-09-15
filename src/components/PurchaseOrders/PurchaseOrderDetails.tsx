// src/components/PurchaseOrders/PurchaseOrderDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Download,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Package,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Send,
  Eye,
  MoreVertical,
  Building2,
  User,
  IndianRupee,
  Truck,
  Hash
} from 'lucide-react';
import { motion } from 'framer-motion';
import { purchaseOrderAPI, PurchaseOrder } from '../../services/purchaseOrderAPI';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const PurchaseOrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuthStore();
  
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const canUpdate = hasPermission('purchase_orders', 'update');
  const canApprove = hasPermission('po_workflow', 'approve_level1');
  const canReject = hasPermission('po_workflow', 'reject');
  const canCancel = hasPermission('po_workflow', 'cancel');
  const canSend = hasPermission('po_workflow', 'send');

  useEffect(() => {
    if (id) {
      loadPurchaseOrder(id);
    }
  }, [id]);

  const loadPurchaseOrder = async (poId: string) => {
    try {
      setLoading(true);
      const response = await purchaseOrderAPI.getPurchaseOrder(poId);
      setPurchaseOrder(response.purchaseOrder);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load purchase order');
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowAction = async (action: string) => {
    if (!purchaseOrder) return;
    
    try {
      setActionLoading(action);
      
      switch (action) {
        case 'approve':
          const response = await purchaseOrderAPI.approvePurchaseOrder(purchaseOrder._id);
          toast.success(response.message || 'Purchase order approved successfully');
          break;
        case 'reject':
          const remarks = prompt('Please enter rejection remarks:');
          if (!remarks) return;
          const rejectResponse = await purchaseOrderAPI.rejectPurchaseOrder(purchaseOrder._id, remarks);
          toast.success(rejectResponse.message || 'Purchase order rejected');
          break;
        case 'cancel':
          if (!confirm('Are you sure you want to cancel this purchase order?')) return;
          const cancelResponse = await purchaseOrderAPI.cancelPurchaseOrder(purchaseOrder._id);
          toast.success(cancelResponse.message || 'Purchase order cancelled');
          break;
        case 'send':
          const sendResponse = await purchaseOrderAPI.sendPurchaseOrderEmail(purchaseOrder._id);
          toast.success(sendResponse.message || 'Purchase order sent to supplier');
          break;
        default:
          toast.error('Unknown action');
          return;
      }
      
      // Reload the purchase order to get updated status
      await loadPurchaseOrder(purchaseOrder._id);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || `Failed to ${action} purchase order`;
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
      setShowActionsMenu(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!purchaseOrder) return;
    
    try {
      setActionLoading('download');
      const response = await purchaseOrderAPI.downloadPurchaseOrder(purchaseOrder._id);
      
      // Create blob and download
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PO-${purchaseOrder.poNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to download PDF';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const getAvailableActions = () => {
    if (!purchaseOrder) return [];
    
    const actions = [];
    const status = purchaseOrder.status;
    
    // Edit action
    if (canUpdate && (status === 'draft')) {
      actions.push({ key: 'edit', label: 'Edit', icon: Edit, color: 'blue' });
    }
    
    // Approve action
    if (canApprove && (status === 'draft' || status === 'pending_approval')) {
      actions.push({ key: 'approve', label: 'Approve', icon: CheckCircle, color: 'green' });
    }
    
    // Reject action
    if (canReject && (status === 'pending_approval' || status === 'approved')) {
      actions.push({ key: 'reject', label: 'Reject', icon: XCircle, color: 'red' });
    }
    
    // Cancel action
    if (canCancel && (status === 'draft' || status === 'pending_approval')) {
      actions.push({ key: 'cancel', label: 'Cancel', icon: XCircle, color: 'red' });
    }
    
    // Send action
    if (canSend && status === 'approved') {
      actions.push({ key: 'send', label: 'Send to Supplier', icon: Send, color: 'blue' });
    }
    
    // Download action - always available
    actions.push({ key: 'download', label: 'Download PDF', icon: Download, color: 'gray' });
    
    return actions;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return FileText;
      case 'pending_approval':
        return Clock;
      case 'approved':
        return CheckCircle;
      case 'rejected':
        return XCircle;
      case 'ordered':
        return Send;
      case 'partial_received':
      case 'received':
        return Package;
      case 'qc_pending':
        return AlertCircle;
      case 'qc_passed':
      case 'completed':
        return CheckCircle;
      case 'qc_failed':
        return XCircle;
      case 'cancelled':
        return XCircle;
      default:
        return FileText;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-gray-600">Loading purchase order...</p>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="text-center py-8">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Purchase order not found</p>
        <button
          onClick={() => navigate('/purchase-orders')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Purchase Orders
        </button>
      </div>
    );
  }

  const availableActions = getAvailableActions();
  const StatusIcon = getStatusIcon(purchaseOrder.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/purchase-orders')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Purchase Order #{purchaseOrder.poNumber}
            </h1>
            <div className="flex items-center mt-1 space-x-4">
              <div className="flex items-center">
                <StatusIcon className="w-4 h-4 mr-1" />
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  purchaseOrderAPI.getStatusBadgeColor(purchaseOrder.status)
                }`}>
                  {purchaseOrderAPI.getStatusLabel(purchaseOrder.status)}
                </span>
              </div>
              <span className="text-gray-500">
                Created on {purchaseOrderAPI.formatDate(purchaseOrder.createdAt)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-2">
          {availableActions.slice(0, 2).map(action => (
            <button
              key={action.key}
              onClick={() => {
                if (action.key === 'edit') {
                  navigate(`/purchase-orders/${purchaseOrder._id}/edit`);
                } else if (action.key === 'download') {
                  handleDownloadPDF();
                } else {
                  handleWorkflowAction(action.key);
                }
              }}
              disabled={actionLoading === action.key}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-white transition-colors ${
                action.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                action.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
                action.color === 'red' ? 'bg-red-600 hover:bg-red-700' :
                'bg-gray-600 hover:bg-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {actionLoading === action.key ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <action.icon className="w-4 h-4 mr-2" />
              )}
              {action.label}
            </button>
          ))}
          
          {availableActions.length > 2 && (
            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {showActionsMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  {availableActions.slice(2).map(action => (
                    <button
                      key={action.key}
                      onClick={() => {
                        if (action.key === 'edit') {
                          navigate(`/purchase-orders/${purchaseOrder._id}/edit`);
                        } else if (action.key === 'download') {
                          handleDownloadPDF();
                        } else {
                          handleWorkflowAction(action.key);
                        }
                      }}
                      disabled={actionLoading === action.key}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === action.key ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      ) : (
                        <action.icon className="w-4 h-4 mr-2" />
                      )}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Principal Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Principal Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-900">{purchaseOrder.principal.name}</h3>
                {purchaseOrder.principal.gstNumber && (
                  <p className="text-gray-600">GST: {purchaseOrder.principal.gstNumber}</p>
                )}
                
                <div className="mt-2 space-y-1">
                  {purchaseOrder.principal.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      <a href={`mailto:${purchaseOrder.principal.email}`} className="hover:text-blue-600">
                        {purchaseOrder.principal.email}
                      </a>
                    </div>
                  )}
                  {purchaseOrder.principal.mobile && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      <a href={`tel:${purchaseOrder.principal.mobile}`} className="hover:text-blue-600">
                        {purchaseOrder.principal.mobile}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bill To & Ship To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Bill To
              </h2>
              
              <div>
                <h3 className="font-medium text-gray-900">{purchaseOrder.billTo.name}</h3>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400" />
                    <p>{purchaseOrder.billTo.address}</p>
                  </div>
                  {purchaseOrder.billTo.gstin && (
                    <p>GSTIN: {purchaseOrder.billTo.gstin}</p>
                  )}
                  {purchaseOrder.billTo.drugLicense && (
                    <p>DL No: {purchaseOrder.billTo.drugLicense}</p>
                  )}
                  {purchaseOrder.billTo.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <p>{purchaseOrder.billTo.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Ship To
              </h2>
              
              <div>
                <h3 className="font-medium text-gray-900">{purchaseOrder.shipTo.name}</h3>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400" />
                    <p>{purchaseOrder.shipTo.address}</p>
                  </div>
                  {purchaseOrder.shipTo.gstin && (
                    <p>GSTIN: {purchaseOrder.shipTo.gstin}</p>
                  )}
                  {purchaseOrder.shipTo.drugLicense && (
                    <p>DL No: {purchaseOrder.shipTo.drugLicense}</p>
                  )}
                  {purchaseOrder.shipTo.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <p>{purchaseOrder.shipTo.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Product Lines */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Product Lines ({purchaseOrder.products.length} items)
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">FOC</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    {(purchaseOrder.status === 'ordered' || purchaseOrder.status === 'partial_received' || purchaseOrder.status === 'received') && (
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {purchaseOrder.products.map((line, index) => {
                    const qty = line.quantity - (line.foc || 0);
                    const baseAmount = qty * line.unitPrice;
                    let discount = 0;
                    
                    if (line.discount && line.discount > 0) {
                      if (line.discountType === 'percentage') {
                        discount = (baseAmount * line.discount) / 100;
                      } else {
                        discount = line.discount;
                      }
                    }
                    
                    const finalTotal = baseAmount - discount;
                    
                    return (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm">{index + 1}</td>
                        <td className="px-4 py-2">
                          <div className="font-medium text-sm">{line.productName}</div>
                          <div className="text-xs text-gray-500">{line.productCode}</div>
                          {line.description && (
                            <div className="text-xs text-gray-500 mt-1">{line.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {line.quantity} {line.unit}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {line.foc || 0} {line.unit}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {purchaseOrderAPI.formatCurrency(line.unitPrice)}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {line.discount && line.discount > 0 ? (
                            <span>
                              {line.discountType === 'percentage' 
                                ? `${line.discount}%` 
                                : purchaseOrderAPI.formatCurrency(line.discount)
                              }
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium">
                          {purchaseOrderAPI.formatCurrency(finalTotal)}
                        </td>
                        {(purchaseOrder.status === 'ordered' || purchaseOrder.status === 'partial_received' || purchaseOrder.status === 'received') && (
                          <td className="px-4 py-2 text-sm">
                            <div>
                              <div>Ordered: {line.quantity}</div>
                              {(line.receivedQty || 0) > 0 && (
                                <div className="text-green-600">Received: {line.receivedQty}</div>
                              )}
                              {(line.backlogQty || 0) > 0 && (
                                <div className="text-orange-600">Backlog: {line.backlogQty}</div>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Workflow History */}
          {purchaseOrder.workflowHistory && purchaseOrder.workflowHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Workflow History
              </h2>
              
              <div className="space-y-4">
                {purchaseOrder.workflowHistory.map((entry, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        entry.action === 'approved' ? 'bg-green-100 text-green-600' :
                        entry.action === 'rejected' ? 'bg-red-100 text-red-600' :
                        entry.action === 'cancelled' ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {entry.action === 'approved' ? <CheckCircle className="w-4 h-4" /> :
                         entry.action === 'rejected' ? <XCircle className="w-4 h-4" /> :
                         entry.action === 'cancelled' ? <XCircle className="w-4 h-4" /> :
                         <Clock className="w-4 h-4" />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)} by {entry.actionBy?.name || 'System'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {purchaseOrderAPI.formatDate(entry.actionDate)}
                        </p>
                      </div>
                      {entry.remarks && (
                        <p className="text-sm text-gray-600 mt-1">{entry.remarks}</p>
                      )}
                      {entry.stage && (
                        <p className="text-xs text-gray-500 mt-1">Stage: {entry.stage.name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <IndianRupee className="w-5 h-5 mr-2" />
              Order Summary
            </h2>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{purchaseOrderAPI.formatCurrency(purchaseOrder.subTotal)}</span>
              </div>
              
              {purchaseOrder.productLevelDiscount > 0 && (
                <div className="flex justify-between">
                  <span>Product-Level Discount:</span>
                  <span className="text-red-600">- {purchaseOrderAPI.formatCurrency(purchaseOrder.productLevelDiscount)}</span>
                </div>
              )}
              
              {purchaseOrder.additionalDiscount && purchaseOrder.additionalDiscount.value > 0 && (
                <div className="flex justify-between">
                  <span>Additional Discount:</span>
                  <span className="text-red-600">
                    - {purchaseOrder.additionalDiscount.type === 'percentage' 
                        ? `${purchaseOrder.additionalDiscount.value}%` 
                        : purchaseOrderAPI.formatCurrency(purchaseOrder.additionalDiscount.value)
                      }
                  </span>
                </div>
              )}
              
              {purchaseOrder.taxType === 'CGST_SGST' ? (
                <>
                  <div className="flex justify-between">
                    <span>CGST ({purchaseOrder.gstRate / 2}%):</span>
                    <span>{purchaseOrderAPI.formatCurrency(purchaseOrder.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST ({purchaseOrder.gstRate / 2}%):</span>
                    <span>{purchaseOrderAPI.formatCurrency(purchaseOrder.sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span>IGST ({purchaseOrder.gstRate}%):</span>
                  <span>{purchaseOrderAPI.formatCurrency(purchaseOrder.igst)}</span>
                </div>
              )}
              
              {purchaseOrder.shippingCharges && purchaseOrder.shippingCharges.value > 0 && (
                <div className="flex justify-between">
                  <span>Shipping Charges:</span>
                  <span>
                    {purchaseOrder.shippingCharges.type === 'percentage' 
                      ? `${purchaseOrder.shippingCharges.value}%` 
                      : purchaseOrderAPI.formatCurrency(purchaseOrder.shippingCharges.value)
                    }
                  </span>
                </div>
              )}
              
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Grand Total:</span>
                <span>{purchaseOrderAPI.formatCurrency(purchaseOrder.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">PO Date:</span>
                <p className="text-sm text-gray-900 flex items-center mt-1">
                  <Calendar className="w-4 h-4 mr-1" />
                  {purchaseOrderAPI.formatDate(purchaseOrder.poDate)}
                </p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-500">Created By:</span>
                <p className="text-sm text-gray-900 flex items-center mt-1">
                  <User className="w-4 h-4 mr-1" />
                  {purchaseOrder.createdBy?.name || 'Unknown'}
                </p>
              </div>
              
              {purchaseOrder.approvedBy && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Approved By:</span>
                  <p className="text-sm text-gray-900 flex items-center mt-1">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {purchaseOrder.approvedBy.name}
                  </p>
                  {purchaseOrder.approvedDate && (
                    <p className="text-xs text-gray-500">
                      {purchaseOrderAPI.formatDate(purchaseOrder.approvedDate)}
                    </p>
                  )}
                </div>
              )}
              
              {purchaseOrder.updatedBy && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Last Updated By:</span>
                  <p className="text-sm text-gray-900">{purchaseOrder.updatedBy.name}</p>
                </div>
              )}
              
              <div>
                <span className="text-sm font-medium text-gray-500">Current Stage:</span>
                <p className="text-sm text-gray-900">
                  {purchaseOrder.currentStage?.name || 'Draft'}
                </p>
              </div>
            </div>
          </div>

          {/* Communication Details */}
          {(purchaseOrder.toEmails.length > 0 || purchaseOrder.fromEmail || purchaseOrder.ccEmails.length > 0) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Communication Details
              </h2>
              
              <div className="space-y-3">
                {purchaseOrder.toEmails.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">To:</span>
                    <div className="text-sm text-gray-900 mt-1">
                      {purchaseOrder.toEmails.map((email, index) => (
                        <div key={index} className="flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          <a href={`mailto:${email}`} className="hover:text-blue-600">
                            {email}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {purchaseOrder.fromEmail && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">From:</span>
                    <p className="text-sm text-gray-900 mt-1">
                      <a href={`mailto:${purchaseOrder.fromEmail}`} className="hover:text-blue-600">
                        {purchaseOrder.fromEmail}
                      </a>
                    </p>
                  </div>
                )}
                
                {purchaseOrder.ccEmails.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">CC:</span>
                    <div className="text-sm text-gray-900 mt-1">
                      {purchaseOrder.ccEmails.map((email, index) => (
                        <div key={index}>
                          <a href={`mailto:${email}`} className="hover:text-blue-600">
                            {email}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {(purchaseOrder.status === 'ordered' || purchaseOrder.status === 'partial_received') && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              
              <div className="space-y-2">
                <Link
                  to={`/invoice-receiving/new?po=${purchaseOrder._id}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Receive Products
                </Link>
                
                <Link
                  to={`/invoice-receiving?po=${purchaseOrder._id}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Receivings
                </Link>
              </div>
            </div>
          )}

          {/* Receiving Status */}
          {(purchaseOrder.status === 'ordered' || purchaseOrder.status === 'partial_received' || purchaseOrder.status === 'received') && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Receiving Status</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Ordered:</span>
                  <span className="text-sm font-medium">
                    {purchaseOrder.products.reduce((sum, p) => sum + p.quantity, 0)} items
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Received:</span>
                  <span className="text-sm font-medium text-green-600">
                    {purchaseOrder.products.reduce((sum, p) => sum + (p.receivedQty || 0), 0)} items
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Backlog:</span>
                  <span className="text-sm font-medium text-orange-600">
                    {purchaseOrder.products.reduce((sum, p) => sum + (p.backlogQty || 0), 0)} items
                  </span>
                </div>
                
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Progress:</span>
                    <span className="text-sm font-medium">
                      {Math.round((purchaseOrder.products.reduce((sum, p) => sum + (p.receivedQty || 0), 0) / 
                                   purchaseOrder.products.reduce((sum, p) => sum + p.quantity, 0)) * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(purchaseOrder.products.reduce((sum, p) => sum + (p.receivedQty || 0), 0) / 
                                 purchaseOrder.products.reduce((sum, p) => sum + p.quantity, 0)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Terms & Notes */}
          {(purchaseOrder.terms || purchaseOrder.notes) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
              
              {purchaseOrder.terms && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Terms & Conditions:</h3>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {purchaseOrder.terms.split('\n').map((line, index) => (
                      <p key={index} className="mb-1 last:mb-0">{line}</p>
                    ))}
                  </div>
                </div>
              )}
              
              {purchaseOrder.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Notes:</h3>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {purchaseOrder.notes.split('\n').map((line, index) => (
                      <p key={index} className="mb-1 last:mb-0">{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderDetails;