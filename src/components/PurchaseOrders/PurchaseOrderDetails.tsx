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
  MoreVertical
} from 'lucide-react';
import { purchaseOrderAPI, PurchaseOrder } from '../../services/purchaseOrderAPI';
import { poFormatters, workflowUtils } from '../../utils/purchaseOrderUtils';
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

  useEffect(() => {
    if (id) {
      loadPurchaseOrder(id);
    }
  }, [id]);

  const loadPurchaseOrder = async (poId: string) => {
    try {
      setLoading(true);
      const response = await purchaseOrderAPI.getPurchaseOrder(poId);
      setPurchaseOrder(response.data);
    } catch (error: any) {
      toast.error('Failed to load purchase order');
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
          await purchaseOrderAPI.approvePurchaseOrder(purchaseOrder._id);
          toast.success('Purchase order approved successfully');
          break;
        case 'reject':
          await purchaseOrderAPI.rejectPurchaseOrder(purchaseOrder._id);
          toast.success('Purchase order rejected');
          break;
        case 'cancel':
          await purchaseOrderAPI.cancelPurchaseOrder(purchaseOrder._id);
          toast.success('Purchase order cancelled');
          break;
        case 'send':
          await purchaseOrderAPI.sendPurchaseOrder(purchaseOrder._id);
          toast.success('Purchase order sent to supplier');
          break;
        default:
          toast.error('Unknown action');
          return;
      }
      
      // Reload the purchase order to get updated status
      await loadPurchaseOrder(purchaseOrder._id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} purchase order`);
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
      const blob = new Blob([response.data], { type: 'application/pdf' });
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
      toast.error('Failed to download PDF');
    } finally {
      setActionLoading(null);
    }
  };

  const getAvailableActions = () => {
    if (!purchaseOrder) return [];
    
    const actions = [];
    
    if (workflowUtils.canEdit(purchaseOrder.status, user?.role)) {
      actions.push({ key: 'edit', label: 'Edit', icon: Edit, color: 'blue' });
    }
    
    if (workflowUtils.canApprove(purchaseOrder.status, user?.role)) {
      actions.push({ key: 'approve', label: 'Approve', icon: CheckCircle, color: 'green' });
    }
    
    if (workflowUtils.canReject(purchaseOrder.status, user?.role)) {
      actions.push({ key: 'reject', label: 'Reject', icon: XCircle, color: 'red' });
    }
    
    if (workflowUtils.canCancel(purchaseOrder.status, user?.role)) {
      actions.push({ key: 'cancel', label: 'Cancel', icon: XCircle, color: 'red' });
    }
    
    if (purchaseOrder.status === 'approved') {
      actions.push({ key: 'send', label: 'Send to Supplier', icon: Send, color: 'blue' });
    }
    
    actions.push({ key: 'download', label: 'Download PDF', icon: Download, color: 'gray' });
    
    return actions;
  };

  const calculateTotals = () => {
    if (!purchaseOrder) return { subTotal: 0, tax: 0, shipping: 0, total: 0 };
    
    const subTotal = purchaseOrder.productLines.reduce((sum, line) => {
      const lineTotal = line.quantity * line.unitPrice;
      const discount = line.discountType === 'percentage' 
        ? (lineTotal * line.discount) / 100 
        : line.discount;
      return sum + (lineTotal - discount);
    }, 0);
    
    const shipping = purchaseOrder.shippingCharges?.type === 'percentage'
      ? (subTotal * (purchaseOrder.shippingCharges.value || 0)) / 100
      : (purchaseOrder.shippingCharges?.value || 0);
    
    const tax = subTotal * 0.18; // Assuming 18% GST
    const total = subTotal + shipping + tax;
    
    return { subTotal, tax, shipping, total };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Purchase order not found</p>
      </div>
    );
  }

  const totals = calculateTotals();
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
                  poFormatters.getStatusBadgeColor(purchaseOrder.status)
                }`}>
                  {poFormatters.getStatusLabel(purchaseOrder.status)}
                </span>
              </div>
              <span className="text-gray-500">
                Created on {poFormatters.formatDate(purchaseOrder.createdAt)}
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
          {/* Supplier Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Supplier Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-900">{purchaseOrder.supplier}</h3>
                {purchaseOrder.supplierContact && (
                  <p className="text-gray-600">{purchaseOrder.supplierContact}</p>
                )}
                
                <div className="mt-2 space-y-1">
                  {purchaseOrder.supplierEmail && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      <a href={`mailto:${purchaseOrder.supplierEmail}`} className="hover:text-blue-600">
                        {purchaseOrder.supplierEmail}
                      </a>
                    </div>
                  )}
                  {purchaseOrder.supplierPhone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      <a href={`tel:${purchaseOrder.supplierPhone}`} className="hover:text-blue-600">
                        {purchaseOrder.supplierPhone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Billing Address</h4>
                <div className="text-sm text-gray-600">
                  <p>{purchaseOrder.billingAddress.street}</p>
                  <p>{purchaseOrder.billingAddress.city}, {purchaseOrder.billingAddress.state}</p>
                  <p>{purchaseOrder.billingAddress.pincode}</p>
                  <p>{purchaseOrder.billingAddress.country}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Product Lines */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Product Lines
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {purchaseOrder.productLines.map((line, index) => {
                    const lineTotal = line.quantity * line.unitPrice;
                    const discount = line.discountType === 'percentage' 
                      ? (lineTotal * line.discount) / 100 
                      : line.discount;
                    const finalTotal = lineTotal - discount;
                    
                    return (
                      <tr key={index}>
                        <td className="px-4 py-2">
                          <div className="font-medium">{line.productName}</div>
                          {line.description && (
                            <div className="text-sm text-gray-500">{line.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {line.quantity} {line.unit}
                        </td>
                        <td className="px-4 py-2">
                          {poFormatters.formatCurrency(line.unitPrice)}
                        </td>
                        <td className="px-4 py-2">
                          {line.discount > 0 ? (
                            <span>
                              {line.discountType === 'percentage' ? `${line.discount}%` : poFormatters.formatCurrency(line.discount)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-medium">
                          {poFormatters.formatCurrency(finalTotal)}
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-sm">
                            <div>Ordered: {line.quantity}</div>
                            {line.receivedQuantity > 0 && (
                              <div className="text-green-600">Received: {line.receivedQuantity}</div>
                            )}
                            {line.backlogQuantity > 0 && (
                              <div className="text-orange-600">Backlog: {line.backlogQuantity}</div>
                            )}
                          </div>
                        </td>
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
                          {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)} by {entry.performedBy?.name || 'System'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {poFormatters.formatDate(entry.timestamp)}
                        </p>
                      </div>
                      {entry.remarks && (
                        <p className="text-sm text-gray-600 mt-1">{entry.remarks}</p>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{poFormatters.formatCurrency(totals.subTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span>{poFormatters.formatCurrency(totals.shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({purchaseOrder.taxType}):</span>
                <span>{poFormatters.formatCurrency(totals.tax)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span>{poFormatters.formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Priority:</span>
                <div className={`inline-block ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  purchaseOrder.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                  purchaseOrder.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  purchaseOrder.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {purchaseOrder.priority?.charAt(0).toUpperCase() + purchaseOrder.priority?.slice(1)}
                </div>
              </div>
              
              {purchaseOrder.expectedDeliveryDate && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Expected Delivery:</span>
                  <p className="text-sm text-gray-900 flex items-center mt-1">
                    <Calendar className="w-4 h-4 mr-1" />
                    {poFormatters.formatDate(purchaseOrder.expectedDeliveryDate)}
                  </p>
                </div>
              )}
              
              <div>
                <span className="text-sm font-medium text-gray-500">Created By:</span>
                <p className="text-sm text-gray-900">{purchaseOrder.createdBy?.name || 'Unknown'}</p>
              </div>
              
              {purchaseOrder.description && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Description:</span>
                  <p className="text-sm text-gray-900 mt-1">{purchaseOrder.description}</p>
                </div>
              )}
            </div>
          </div>

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

          {/* Shipping Address */}
          {!purchaseOrder.shippingAddress.sameAsBilling && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Shipping Address
              </h2>
              
              <div className="text-sm text-gray-600">
                <p>{purchaseOrder.shippingAddress.street}</p>
                <p>{purchaseOrder.shippingAddress.city}, {purchaseOrder.shippingAddress.state}</p>
                <p>{purchaseOrder.shippingAddress.pincode}</p>
                <p>{purchaseOrder.shippingAddress.country}</p>
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
                  <p className="text-sm text-gray-900">{purchaseOrder.terms}</p>
                </div>
              )}
              
              {purchaseOrder.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Notes:</h3>
                  <p className="text-sm text-gray-900">{purchaseOrder.notes}</p>
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