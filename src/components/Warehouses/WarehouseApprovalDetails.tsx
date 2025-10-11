// src/components/Warehouses/WarehouseApprovalDetails.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Package,
  FileText,
  Calendar,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  User,
  Save,
  Send,
  MessageSquare,
  Download,
  Camera,
  Plus,
  Minus,
  Search,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../utils/helpers';
import { warehouseApprovalAPI, WarehouseApproval, WarehouseApprovalProduct } from '../../services/warehouseApprovalAPI';
import toast from 'react-hot-toast';

const WarehouseApprovalDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, hasPermission } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approval, setApproval] = useState<WarehouseApproval | null>(null);
  const [activeTab, setActiveTab] = useState('products');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');

  useEffect(() => {
    if (id) {
      loadWarehouseApproval(id);
    }
  }, [id]);

  const loadWarehouseApproval = async (approvalId: string) => {
    try {
      setLoading(true);
      const response = await warehouseApprovalAPI.getWarehouseApproval(approvalId);
      setApproval(response.data);
    } catch (error) {
      console.error('Error loading warehouse approval:', error);
      toast.error('Failed to load warehouse approval details');
    } finally {
      setLoading(false);
    }
  };

  const updateProductCheck = async (productId: string, updates: Partial<WarehouseApprovalProduct>) => {
    if (!approval) return;

    try {
      setSaving(true);
      // Find the product index in the products array
      const productIndex = approval.products.findIndex(p => p.product === productId);
      if (productIndex === -1) {
        toast.error('Product not found');
        return;
      }

      // Call the API to update the product
      await warehouseApprovalAPI.updateProductWarehouseCheck(approval._id, productIndex, {
        warehouseDecision: updates.warehouseDecision || 'approved',
        warehouseRemarks: updates.warehouseRemarks,
        approvedQty: updates.approvedQty,
        storageLocation: updates.storageLocation
      });
      
      // Update local state
      setApproval(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          products: prev.products.map(product =>
            product.product === productId ? { ...product, ...updates } : product
          )
        };
      });
      
      toast.success('Product check updated successfully');
      setEditingProduct(null);
    } catch (error) {
      console.error('Error updating product check:', error);
      toast.error('Failed to update product check');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedProducts.length === 0 || !approval) return;

    try {
      // Update each product
      for (const productId of selectedProducts) {
        const productIndex = approval.products.findIndex(p => p.product === productId);
        if (productIndex !== -1) {
          await warehouseApprovalAPI.updateProductWarehouseCheck(approval._id, productIndex, {
            warehouseDecision: bulkAction as 'approved' | 'rejected',
            warehouseRemarks: `Bulk ${bulkAction} by ${user?.name || 'Current User'}`,
            approvedQty: bulkAction === 'approved' ? approval.products[productIndex].qcPassedQty : 0,
            storageLocation: bulkAction === 'approved' ? approval.products[productIndex].storageLocation : undefined
          });
        }
      }
      
      // Update local state
      setApproval(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          products: prev.products.map(product => 
          selectedProducts.includes(product.product) 
            ? { 
                ...product, 
                warehouseDecision: bulkAction as 'approved' | 'rejected',
                warehouseRemarks: `Bulk ${bulkAction} by ${user?.name || 'Current User'}`,
                approvedQty: bulkAction === 'approved' ? product.qcPassedQty : 0
              }
            : product
        )
        };
      });
      
      toast.success(`Bulk ${bulkAction} completed successfully`);
      setSelectedProducts([]);
      setBulkAction('');
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error(`Failed to perform bulk ${bulkAction}`);
    }
  };

  const submitForManagerApproval = async () => {
    if (!approval) return;

    try {
      setSubmitting(true);
      // TODO: Replace with actual API call
      // await warehouseApprovalAPI.submitForApproval(approval._id);
      
      setApproval(prev => prev ? { 
        ...prev, 
        status: 'submitted', 
        submittedAt: new Date().toISOString(),
        submittedBy: { name: user?.name || 'Current User' }
      } : prev);
      
      toast.success('Warehouse approval submitted for manager review');
    } catch (error) {
      console.error('Error submitting approval:', error);
      toast.error('Failed to submit for approval');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManagerApproval = async () => {
    if (!approval) return;

    try {
      // TODO: Replace with actual API call
      // await warehouseApprovalAPI.managerApproval(approval._id, {
      //   action: approvalAction,
      //   remarks: approvalRemarks
      // });
      
      setApproval(prev => prev ? {
        ...prev,
        status: approvalAction === 'approve' ? 'approved' : 'rejected',
        approvedAt: new Date().toISOString(),
        approvedBy: { name: user?.name || 'Current User' },
        managerRemarks: approvalRemarks,
        rejectionReason: approvalAction === 'reject' ? approvalRemarks : undefined
      } : prev);
      
      toast.success(`Warehouse approval ${approvalAction}d successfully`);
      setShowApprovalModal(false);
      setApprovalRemarks('');
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error(`Failed to ${approvalAction} warehouse approval`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'submitted':
        return <Send className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDateLocal = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canEditProducts = () => {
    return hasPermission('warehouse_approval', 'update') && 
           approval && (approval.status === 'pending' || approval.status === 'submitted');
  };

  const canSubmit = () => {
    return hasPermission('warehouse_approval', 'submit') && 
           approval && approval.status === 'pending' &&
           approval.products.every(product => product.warehouseDecision && product.warehouseDecision !== 'pending');
  };

  const canApprove = () => {
    return hasPermission('warehouse_approval', 'approve') && 
           approval && approval.status === 'submitted';
  };

  const filteredProducts = approval?.products.filter(product => {
    const matchesSearch = product.productName.toLowerCase().includes(productFilter.toLowerCase()) ||
                          product.productCode.toLowerCase().includes(productFilter.toLowerCase()) ||
                          (product.batchNo && product.batchNo.toLowerCase().includes(productFilter.toLowerCase()));
    const matchesStatus = !statusFilter || product.warehouseDecision === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Warehouse approval record not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/warehouse-approvals')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Warehouse Approval - WA-{approval._id.slice(-6).toUpperCase()}
            </h1>
            <div className="flex items-center space-x-4 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getStatusColor(approval.status)
              }`}>
                {getStatusIcon(approval.status)}
                <span className="ml-1 capitalize">{approval.status}</span>
              </span>
              
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getPriorityColor(approval.priority)
              }`}>
                <span className="capitalize">{approval.priority} Priority</span>
              </span>
              
              <span className="text-gray-500 text-sm">
                Created {formatDateLocal(approval.createdAt)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          {canSubmit() && (
            <button
              onClick={submitForManagerApproval}
              disabled={submitting}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
          
          {canApprove() && (
            <>
              <button
                onClick={() => {
                  setApprovalAction('approve');
                  setShowApprovalModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </button>
              
              <button
                onClick={() => {
                  setApprovalAction('reject');
                  setShowApprovalModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Invoice Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Invoice Number</label>
            <p className="text-gray-900 font-medium">{approval.invoiceReceiving.invoiceNumber}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Purchase Order</label>
            <Link 
              to={`/purchase-orders/${approval.invoiceReceiving?.purchaseOrder?._id || '#'}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {approval.invoiceReceiving?.purchaseOrder?.poNumber || 'N/A'}
            </Link>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Principal</label>
            <p className="text-gray-900">{approval.invoiceReceiving?.purchaseOrder?.principal?.name || 'N/A'}</p>
            <p className="text-sm text-gray-500">{approval.invoiceReceiving?.purchaseOrder?.principal?.email || 'N/A'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Warehouse</label>
            <p className="text-gray-900">{approval.invoiceReceiving?.warehouse?.name || 'N/A'}</p>
            <p className="text-sm text-gray-500">{approval.invoiceReceiving?.warehouse?.location || 'N/A'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Received Date</label>
            <p className="text-gray-900">{formatDateLocal(approval.invoiceReceiving.receivedDate)}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Received By</label>
            <p className="text-gray-900">{approval.invoiceReceiving.receivedBy.name}</p>
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{approval.totalItems}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{approval.approvedItems}</div>
              <div className="text-sm text-gray-600">Approved</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{approval.rejectedItems}</div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{approval.pendingItems}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Products ({approval.products.length})
            </button>
            
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Summary
            </button>
            
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              History
            </button>
          </nav>
        </div>

        {/* Product Checks Tab */}
        {activeTab === 'products' && (
          <div className="p-6">
            {/* Filters and Bulk Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              {selectedProducts.length > 0 && canEditProducts() && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    {selectedProducts.length} selected
                  </span>
                  
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="">Bulk Action</option>
                    <option value="approved">Approve Selected</option>
                    <option value="rejected">Reject Selected</option>
                  </select>
                  
                  <button
                    onClick={handleBulkAction}
                    disabled={!bulkAction}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Product List */}
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.product}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start space-x-3">
                      {canEditProducts() && (
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.product)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts(prev => [...prev, product.product]);
                            } else {
                              setSelectedProducts(prev => prev.filter(id => id !== product.product));
                            }
                          }}
                          className="mt-1 rounded border-gray-300"
                        />
                      )}
                      
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900">{product.productName}</h4>
                        <div className="text-sm text-gray-500 mt-1">
                          Code: {product.productCode} | QC Passed: {product.qcPassedQty} | Warehouse: {product.warehouseQty}
                          {product.batchNo && ` | Batch: ${product.batchNo}`}
                          {product.expDate && ` | Expires: ${formatDateLocal(product.expDate)}`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getStatusColor(product.warehouseDecision || 'pending')
                      }`}>
                        {getStatusIcon(product.warehouseDecision || 'pending')}
                        <span className="ml-1 capitalize">{product.warehouseDecision || 'pending'}</span>
                      </span>
                      
                      {canEditProducts() && (
                        <button
                          onClick={() => setEditingProduct(editingProduct === product.product ? null : product.product)}
                          className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          {editingProduct === product.product ? 'Cancel' : 'Edit'}
                        </button>
                      )}
                    </div>
                  </div>

                  {editingProduct === product.product ? (
                    <WarehouseProductEditForm
                      product={product}
                      onSave={(updates) => updateProductCheck(product.product, updates)}
                      onCancel={() => setEditingProduct(null)}
                      saving={saving}
                    />
                  ) : (
                    <WarehouseProductDisplay product={product} />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Approval Progress</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Approved Items</span>
                    <span className="text-sm font-medium text-green-600">
                      {approval.approvedItems} / {approval.totalItems}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(approval.approvedItems / approval.totalItems) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Status Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Pending:</span>
                    <span className="text-sm font-medium text-yellow-600">{approval.pendingItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Approved:</span>
                    <span className="text-sm font-medium text-green-600">{approval.approvedItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Rejected:</span>
                    <span className="text-sm font-medium text-red-600">{approval.rejectedItems}</span>
                  </div>
                </div>
              </div>
            </div>

            {approval.managerRemarks && (
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Manager Remarks</h4>
                <p className="text-gray-700">{approval.managerRemarks}</p>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Warehouse Approval Created</div>
                  <div className="text-sm text-gray-500">{formatDateLocal(approval.createdAt)}</div>
                  <div className="text-sm text-gray-500">by {approval.invoiceReceiving.receivedBy.name}</div>
                </div>
              </div>

              {approval.submittedAt && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Send className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Submitted for Manager Approval</div>
                    <div className="text-sm text-gray-500">{formatDateLocal(approval.submittedAt)}</div>
                    {approval.submittedBy && <div className="text-sm text-gray-500">by {approval.submittedBy.name}</div>}
                  </div>
                </div>
              )}

              {approval.approvedAt && (
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    approval.status === 'approved' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {approval.status === 'approved' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {approval.status === 'approved' ? 'Approved by Manager' : 'Rejected by Manager'}
                    </div>
                    <div className="text-sm text-gray-500">{formatDateLocal(approval.approvedAt)}</div>
                    {approval.approvedBy && <div className="text-sm text-gray-500">by {approval.approvedBy.name}</div>}
                    {approval.rejectionReason && (
                      <div className="text-sm text-red-600 mt-1">Reason: {approval.rejectionReason}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manager Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Warehouse Approval
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {approvalAction === 'approve' ? 'Approval Comments' : 'Rejection Reason'}
              </label>
              <textarea
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={approvalAction === 'approve' ? 'Optional comments...' : 'Please provide reason for rejection...'}
                required={approvalAction === 'reject'}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalRemarks('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleManagerApproval}
                disabled={approvalAction === 'reject' && !approvalRemarks.trim()}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                  approvalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {approvalAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Warehouse Product Display Component
const WarehouseProductDisplay: React.FC<{ product: WarehouseApprovalProduct }> = ({ product }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Quantity Information */}
      <div>
           <h5 className="font-medium text-gray-900 mb-3">Quantity Information</h5>
           <div className="space-y-2">
             <div className="flex justify-between">
               <span className="text-sm text-gray-600">QC Passed:</span>
               <span className="text-sm font-medium text-gray-900">{product.qcPassedQty}</span>
             </div>
             <div className="flex justify-between">
               <span className="text-sm text-gray-600">Warehouse Qty:</span>
               <span className="text-sm font-medium text-gray-900">{product.warehouseQty}</span>
             </div>
             <div className="flex justify-between">
               <span className="text-sm text-gray-600">Approved:</span>
               <span className="text-sm font-medium text-gray-900">{product.approvedQty || 0}</span>
             </div>
           </div>
         </div>

      {/* Storage Information */}
      <div>
        <h5 className="font-medium text-gray-900 mb-3">Storage Information</h5>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Location:</span>
            <span className="text-sm font-medium text-gray-900">{product.storageLocation || 'Not assigned'}</span>
          </div>
          {product.batchNo && (
             <div className="flex justify-between">
               <span className="text-sm text-gray-600">Batch:</span>
               <span className="text-sm font-medium text-gray-900">{product.batchNo}</span>
             </div>
           )}
           {product.expDate && (
             <div className="flex justify-between">
               <span className="text-sm text-gray-600">Expiry:</span>
               <span className="text-sm font-medium text-gray-900">{formatDateLocal(product.expDate)}</span>
             </div>
           )}
        </div>
      </div>

      {/* Decision Information */}
      <div>
        <h5 className="font-medium text-gray-900 mb-3">Warehouse Decision</h5>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <span className={`text-sm font-medium ${
              product.warehouseDecision === 'approved' ? 'text-green-600' :
              product.warehouseDecision === 'rejected' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {product.warehouseDecision || 'Pending'}
            </span>
          </div>
          {product.warehouseRemarks && (
            <div>
              <span className="text-sm text-gray-600">Remarks:</span>
              <p className="text-sm text-gray-700 mt-1">{product.warehouseRemarks}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Warehouse Product Edit Form Component
const WarehouseProductEditForm: React.FC<{
  product: WarehouseApprovalProduct;
  onSave: (updates: Partial<WarehouseApprovalProduct>) => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ product, onSave, onCancel, saving }) => {
  const [formData, setFormData] = useState({
    warehouseDecision: product.warehouseDecision || 'pending',
    approvedQty: product.approvedQty || product.qcPassedQty,
    storageLocation: product.storageLocation?.warehouse || '',
    warehouseRemarks: product.warehouseRemarks || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Decision */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse Decision</label>
        <select
          value={formData.warehouseDecision}
          onChange={(e) => setFormData(prev => ({ ...prev, warehouseDecision: e.target.value as any }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Approved Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Approved Quantity</label>
          <div className="flex items-center space-x-2">
            <input
               type="number"
               value={formData.approvedQty}
               onChange={(e) => setFormData(prev => ({ ...prev, approvedQty: parseFloat(e.target.value) || 0 }))}
               className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               step="0.01"
               min="0"
               max={product.qcPassedQty}
               disabled={formData.warehouseDecision === 'rejected'}
             />
             <span className="text-sm text-gray-500">units</span>
           </div>
           <div className="text-xs text-gray-500 mt-1">
             QC Passed: {product.qcPassedQty} units
           </div>
        </div>

        {/* Storage Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Storage Location</label>
          <input
            type="text"
            value={formData.storageLocation}
            onChange={(e) => setFormData(prev => ({ ...prev, storageLocation: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., A1-B2-C3"
            disabled={formData.warehouseDecision === 'rejected'}
          />
        </div>
      </div>

      {/* Remarks */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse Remarks</label>
        <textarea
          value={formData.warehouseRemarks}
          onChange={(e) => setFormData(prev => ({ ...prev, warehouseRemarks: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Add any comments about the warehouse decision..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default WarehouseApprovalDetails;