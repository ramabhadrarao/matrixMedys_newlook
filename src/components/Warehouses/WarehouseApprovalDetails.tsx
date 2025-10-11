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
import toast from 'react-hot-toast';

interface ProductCheck {
  _id: string;
  productId: string;
  productName: string;
  category: string;
  receivedQty: number;
  unit: string;
  batchNumber?: string;
  expiryDate?: string;
  status: 'pending' | 'approved' | 'rejected';
  checkedBy?: {
    name: string;
  };
  checkedAt?: string;
  remarks?: string;
  images: Array<{
    filename: string;
    originalName: string;
    uploadedAt: string;
  }>;
  physicalCondition: {
    packaging: 'good' | 'damaged' | 'acceptable';
    labeling: 'correct' | 'incorrect' | 'missing';
    appearance: 'normal' | 'abnormal' | 'acceptable';
  };
  quantityVerification: {
    actualQty: number;
    variance: number;
    acceptable: boolean;
  };
  documentationStatus: {
    invoiceMatch: boolean;
    poMatch: boolean;
    certificatesAvailable: boolean;
  };
}

interface WarehouseApproval {
  _id: string;
  invoiceReceiving: {
    _id: string;
    invoiceNumber: string;
    receivedDate: string;
    purchaseOrder: {
      _id: string;
      poNumber: string;
      principal: {
        name: string;
        email: string;
        phone?: string;
      };
    };
    warehouse: {
      name: string;
      location: string;
    };
    receivedBy: {
      name: string;
    };
  };
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  productChecks: ProductCheck[];
  submittedBy?: {
    name: string;
  };
  approvedBy?: {
    name: string;
  };
  submittedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  managerRemarks?: string;
  totalItems: number;
  approvedItems: number;
  rejectedItems: number;
  pendingItems: number;
  createdAt: string;
  updatedAt: string;
}

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
      // TODO: Replace with actual API call
      // const response = await warehouseApprovalAPI.getById(approvalId);
      // setApproval(response.data);
      
      // Mock data for now
      const mockApproval: WarehouseApproval = {
        _id: approvalId,
        invoiceReceiving: {
          _id: 'ir1',
          invoiceNumber: 'INV-2024-001',
          receivedDate: '2024-01-15T10:30:00Z',
          purchaseOrder: {
            _id: 'po1',
            poNumber: 'PO-2024-001',
            principal: {
              name: 'MedSupply Corp',
              email: 'orders@medsupply.com',
              phone: '+1-555-0123'
            }
          },
          warehouse: {
            name: 'Main Warehouse',
            location: 'Building A, Floor 1'
          },
          receivedBy: {
            name: 'John Doe'
          }
        },
        status: 'submitted',
        priority: 'high',
        productChecks: [
          {
            _id: 'pc1',
            productId: 'p1',
            productName: 'Surgical Gloves - Latex Free',
            category: 'Medical Supplies',
            receivedQty: 100,
            unit: 'boxes',
            batchNumber: 'SG2024001',
            expiryDate: '2025-12-31T00:00:00Z',
            status: 'approved',
            checkedBy: {
              name: 'Jane Smith'
            },
            checkedAt: '2024-01-15T11:00:00Z',
            remarks: 'All items in good condition, packaging intact',
            images: [],
            physicalCondition: {
              packaging: 'good',
              labeling: 'correct',
              appearance: 'normal'
            },
            quantityVerification: {
              actualQty: 100,
              variance: 0,
              acceptable: true
            },
            documentationStatus: {
              invoiceMatch: true,
              poMatch: true,
              certificatesAvailable: true
            }
          },
          {
            _id: 'pc2',
            productId: 'p2',
            productName: 'Syringes 10ml Disposable',
            category: 'Medical Devices',
            receivedQty: 500,
            unit: 'pieces',
            batchNumber: 'SY2024002',
            expiryDate: '2026-06-30T00:00:00Z',
            status: 'pending',
            images: [],
            physicalCondition: {
              packaging: 'good',
              labeling: 'correct',
              appearance: 'normal'
            },
            quantityVerification: {
              actualQty: 495,
              variance: -5,
              acceptable: true
            },
            documentationStatus: {
              invoiceMatch: true,
              poMatch: true,
              certificatesAvailable: false
            }
          },
          {
            _id: 'pc3',
            productId: 'p3',
            productName: 'Bandages Elastic 4 inch',
            category: 'Medical Supplies',
            receivedQty: 200,
            unit: 'rolls',
            batchNumber: 'BE2024003',
            status: 'rejected',
            checkedBy: {
              name: 'Bob Wilson'
            },
            checkedAt: '2024-01-15T12:30:00Z',
            remarks: 'Packaging damaged, some items exposed to moisture',
            images: [],
            physicalCondition: {
              packaging: 'damaged',
              labeling: 'correct',
              appearance: 'acceptable'
            },
            quantityVerification: {
              actualQty: 200,
              variance: 0,
              acceptable: true
            },
            documentationStatus: {
              invoiceMatch: true,
              poMatch: true,
              certificatesAvailable: true
            }
          }
        ],
        submittedBy: {
          name: 'John Doe'
        },
        submittedAt: '2024-01-15T13:00:00Z',
        totalItems: 3,
        approvedItems: 1,
        rejectedItems: 1,
        pendingItems: 1,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T13:00:00Z'
      };
      
      setApproval(mockApproval);
    } catch (error) {
      console.error('Error loading warehouse approval:', error);
      toast.error('Failed to load warehouse approval details');
    } finally {
      setLoading(false);
    }
  };

  const updateProductCheck = async (productId: string, updates: Partial<ProductCheck>) => {
    if (!approval) return;

    try {
      setSaving(true);
      // TODO: Replace with actual API call
      // await warehouseApprovalAPI.updateProductCheck(approval._id, productId, updates);
      
      // Update local state
      setApproval(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          productChecks: prev.productChecks.map(product => 
            product._id === productId ? { ...product, ...updates } : product
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
      // TODO: Replace with actual API call
      // await warehouseApprovalAPI.bulkUpdateProducts(approval._id, selectedProducts, bulkAction);
      
      // Update local state
      setApproval(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          productChecks: prev.productChecks.map(product => 
            selectedProducts.includes(product._id) 
              ? { ...product, status: bulkAction as any, checkedBy: { name: user?.name || 'Current User' }, checkedAt: new Date().toISOString() }
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

  const formatDate = (dateString: string) => {
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
           approval.productChecks.every(product => product.status !== 'pending');
  };

  const canApprove = () => {
    return hasPermission('warehouse_approval', 'approve') && 
           approval && approval.status === 'submitted';
  };

  const filteredProducts = approval?.productChecks.filter(product => {
    const matchesSearch = product.productName.toLowerCase().includes(productFilter.toLowerCase()) ||
                         product.category.toLowerCase().includes(productFilter.toLowerCase()) ||
                         (product.batchNumber && product.batchNumber.toLowerCase().includes(productFilter.toLowerCase()));
    const matchesStatus = !statusFilter || product.status === statusFilter;
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
                Created {formatDate(approval.createdAt)}
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
              to={`/purchase-orders/${approval.invoiceReceiving.purchaseOrder._id}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {approval.invoiceReceiving.purchaseOrder.poNumber}
            </Link>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Principal</label>
            <p className="text-gray-900">{approval.invoiceReceiving.purchaseOrder.principal.name}</p>
            <p className="text-sm text-gray-500">{approval.invoiceReceiving.purchaseOrder.principal.email}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Warehouse</label>
            <p className="text-gray-900">{approval.invoiceReceiving.warehouse.name}</p>
            <p className="text-sm text-gray-500">{approval.invoiceReceiving.warehouse.location}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Received Date</label>
            <p className="text-gray-900">{formatDate(approval.invoiceReceiving.receivedDate)}</p>
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
              Product Checks ({approval.productChecks.length})
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
                  key={product._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start space-x-3">
                      {canEditProducts() && (
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts(prev => [...prev, product._id]);
                            } else {
                              setSelectedProducts(prev => prev.filter(id => id !== product._id));
                            }
                          }}
                          className="mt-1 rounded border-gray-300"
                        />
                      )}
                      
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900">{product.productName}</h4>
                        <div className="text-sm text-gray-500 mt-1">
                          Category: {product.category} | Qty: {product.receivedQty} {product.unit}
                          {product.batchNumber && ` | Batch: ${product.batchNumber}`}
                          {product.expiryDate && ` | Expires: ${formatDate(product.expiryDate)}`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getStatusColor(product.status)
                      }`}>
                        {getStatusIcon(product.status)}
                        <span className="ml-1 capitalize">{product.status}</span>
                      </span>
                      
                      {canEditProducts() && (
                        <button
                          onClick={() => setEditingProduct(editingProduct === product._id ? null : product._id)}
                          className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          {editingProduct === product._id ? 'Cancel' : 'Edit'}
                        </button>
                      )}
                    </div>
                  </div>

                  {editingProduct === product._id ? (
                    <ProductCheckEditForm
                      product={product}
                      onSave={(updates) => updateProductCheck(product._id, updates)}
                      onCancel={() => setEditingProduct(null)}
                      saving={saving}
                    />
                  ) : (
                    <ProductCheckDisplay product={product} />
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
                  <div className="text-sm text-gray-500">{formatDate(approval.createdAt)}</div>
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
                    <div className="text-sm text-gray-500">{formatDate(approval.submittedAt)}</div>
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
                    <div className="text-sm text-gray-500">{formatDate(approval.approvedAt)}</div>
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

// Product Check Display Component
const ProductCheckDisplay: React.FC<{ product: ProductCheck }> = ({ product }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Physical Condition */}
      <div>
        <h5 className="font-medium text-gray-900 mb-3">Physical Condition</h5>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Packaging:</span>
            <span className={`text-sm font-medium ${
              product.physicalCondition.packaging === 'good' ? 'text-green-600' :
              product.physicalCondition.packaging === 'damaged' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {product.physicalCondition.packaging}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Labeling:</span>
            <span className={`text-sm font-medium ${
              product.physicalCondition.labeling === 'correct' ? 'text-green-600' : 'text-red-600'
            }`}>
              {product.physicalCondition.labeling}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Appearance:</span>
            <span className={`text-sm font-medium ${
              product.physicalCondition.appearance === 'normal' ? 'text-green-600' :
              product.physicalCondition.appearance === 'abnormal' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {product.physicalCondition.appearance}
            </span>
          </div>
        </div>
      </div>

      {/* Quantity Verification */}
      <div>
        <h5 className="font-medium text-gray-900 mb-3">Quantity Verification</h5>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Expected:</span>
            <span className="text-sm font-medium text-gray-900">{product.receivedQty}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Actual:</span>
            <span className="text-sm font-medium text-gray-900">{product.quantityVerification.actualQty}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Variance:</span>
            <span className={`text-sm font-medium ${
              product.quantityVerification.variance === 0 ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {product.quantityVerification.variance > 0 ? '+' : ''}{product.quantityVerification.variance}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Acceptable:</span>
            <span className={`text-sm font-medium ${
              product.quantityVerification.acceptable ? 'text-green-600' : 'text-red-600'
            }`}>
              {product.quantityVerification.acceptable ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Documentation Status */}
      <div>
        <h5 className="font-medium text-gray-900 mb-3">Documentation</h5>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Invoice Match:</span>
            <span className={`text-sm font-medium ${
              product.documentationStatus.invoiceMatch ? 'text-green-600' : 'text-red-600'
            }`}>
              {product.documentationStatus.invoiceMatch ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">PO Match:</span>
            <span className={`text-sm font-medium ${
              product.documentationStatus.poMatch ? 'text-green-600' : 'text-red-600'
            }`}>
              {product.documentationStatus.poMatch ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Certificates:</span>
            <span className={`text-sm font-medium ${
              product.documentationStatus.certificatesAvailable ? 'text-green-600' : 'text-red-600'
            }`}>
              {product.documentationStatus.certificatesAvailable ? 'Available' : 'Missing'}
            </span>
          </div>
        </div>
      </div>

      {/* Remarks and Check Info */}
      {(product.remarks || product.checkedBy) && (
        <div className="md:col-span-3">
          {product.remarks && (
            <div className="mb-4">
              <h5 className="font-medium text-gray-900 mb-2">Remarks</h5>
              <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">{product.remarks}</p>
            </div>
          )}
          
          {product.checkedBy && (
            <div className="text-sm text-gray-500">
              Checked by {product.checkedBy.name} on {product.checkedAt && formatDate(product.checkedAt)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Product Check Edit Form Component
const ProductCheckEditForm: React.FC<{
  product: ProductCheck;
  onSave: (updates: Partial<ProductCheck>) => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ product, onSave, onCancel, saving }) => {
  const [formData, setFormData] = useState({
    status: product.status,
    physicalCondition: { ...product.physicalCondition },
    quantityVerification: { ...product.quantityVerification },
    documentationStatus: { ...product.documentationStatus },
    remarks: product.remarks || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      checkedBy: { name: 'Current User' }, // TODO: Get from auth store
      checkedAt: new Date().toISOString()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Check Result</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Physical Condition */}
        <div>
          <h5 className="font-medium text-gray-900 mb-3">Physical Condition</h5>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Packaging</label>
              <select
                value={formData.physicalCondition.packaging}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  physicalCondition: { ...prev.physicalCondition, packaging: e.target.value as any }
                }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="good">Good</option>
                <option value="acceptable">Acceptable</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Labeling</label>
              <select
                value={formData.physicalCondition.labeling}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  physicalCondition: { ...prev.physicalCondition, labeling: e.target.value as any }
                }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="correct">Correct</option>
                <option value="incorrect">Incorrect</option>
                <option value="missing">Missing</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Appearance</label>
              <select
                value={formData.physicalCondition.appearance}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  physicalCondition: { ...prev.physicalCondition, appearance: e.target.value as any }
                }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="normal">Normal</option>
                <option value="acceptable">Acceptable</option>
                <option value="abnormal">Abnormal</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quantity Verification */}
        <div>
          <h5 className="font-medium text-gray-900 mb-3">Quantity Verification</h5>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Actual Quantity</label>
              <input
                type="number"
                value={formData.quantityVerification.actualQty}
                onChange={(e) => {
                  const actualQty = parseFloat(e.target.value) || 0;
                  const variance = actualQty - product.receivedQty;
                  setFormData(prev => ({
                    ...prev,
                    quantityVerification: { 
                      ...prev.quantityVerification, 
                      actualQty,
                      variance,
                      acceptable: Math.abs(variance) <= (product.receivedQty * 0.05) // 5% tolerance
                    }
                  }));
                }}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                step="0.01"
                min="0"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Variance</label>
              <input
                type="number"
                value={formData.quantityVerification.variance}
                readOnly
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.quantityVerification.acceptable}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  quantityVerification: { ...prev.quantityVerification, acceptable: e.target.checked }
                }))}
                className="rounded border-gray-300 mr-2"
              />
              <label className="text-sm text-gray-600">Acceptable</label>
            </div>
          </div>
        </div>

        {/* Documentation Status */}
        <div>
          <h5 className="font-medium text-gray-900 mb-3">Documentation</h5>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.documentationStatus.invoiceMatch}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  documentationStatus: { ...prev.documentationStatus, invoiceMatch: e.target.checked }
                }))}
                className="rounded border-gray-300 mr-2"
              />
              <label className="text-sm text-gray-600">Invoice Match</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.documentationStatus.poMatch}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  documentationStatus: { ...prev.documentationStatus, poMatch: e.target.checked }
                }))}
                className="rounded border-gray-300 mr-2"
              />
              <label className="text-sm text-gray-600">PO Match</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.documentationStatus.certificatesAvailable}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  documentationStatus: { ...prev.documentationStatus, certificatesAvailable: e.target.checked }
                }))}
                className="rounded border-gray-300 mr-2"
              />
              <label className="text-sm text-gray-600">Certificates Available</label>
            </div>
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
        <textarea
          value={formData.remarks}
          onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Add any additional comments or observations..."
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