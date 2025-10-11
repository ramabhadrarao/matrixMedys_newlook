// src/components/QualityControl/QualityControlDetails.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Package,
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ClipboardCheck,
  Send,
  User,
  TrendingUp,
  Truck
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { qualityControlAPI } from '../../services/qualityControlAPI';
import { warehouseApprovalAPI } from '../../services/warehouseApprovalAPI';
import toast from 'react-hot-toast';

interface QCItemDetail {
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

interface QCProduct {
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

interface QualityControl {
  _id: string;
  qcNumber: string;
  invoiceReceiving: {
    _id: string;
    invoiceNumber: string;
    invoiceDate: string;
    receivedBy?: {
      name: string;
    };
  };
  purchaseOrder?: {
    _id: string;
    poNumber: string;
    poDate: string;
  };
  status: 'pending' | 'in_progress' | 'pending_approval' | 'completed' | 'rejected';
  qcType: 'standard' | 'urgent' | 'special';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  overallResult?: 'pending' | 'passed' | 'failed' | 'partial_pass';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  assignedTo?: {
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
  createdAt: string;
  updatedAt: string;
}

const QualityControlDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, hasPermission } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [qc, setQc] = useState<QualityControl | null>(null);
  const [activeTab, setActiveTab] = useState('products');
  const [submitting, setSubmitting] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [sendingToWarehouse, setSendingToWarehouse] = useState(false);

  useEffect(() => {
    if (id) {
      loadQualityControl(id);
    }
  }, [id]);

  const loadQualityControl = async (qcId: string) => {
    try {
      setLoading(true);
      const response = await qualityControlAPI.getQCRecord(qcId);
      
      if (response.success) {
        console.log('QC Record loaded:', response.data);
        setQc(response.data);
      } else {
        toast.error('Failed to load quality control details');
        navigate('/quality-control');
      }
    } catch (error: any) {
      console.error('Error loading quality control:', error);
      toast.error(error.message || 'Failed to load quality control details');
      navigate('/quality-control');
    } finally {
      setLoading(false);
    }
  };

  const submitForApproval = async () => {
    if (!qc) return;

    try {
      setSubmitting(true);
      const response = await qualityControlAPI.submitQCForApproval(qc._id, {
        qcRemarks: qc.qcRemarks,
        qcEnvironment: qc.qcEnvironment
      });
      
      if (response.success) {
        toast.success('Quality control submitted for approval');
        await loadQualityControl(qc._id);
      } else {
        toast.error(response.message || 'Failed to submit quality control');
      }
    } catch (error: any) {
      console.error('Error submitting QC:', error);
      toast.error(error.message || 'Failed to submit quality control');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproval = async () => {
    if (!qc) return;

    if (approvalAction === 'reject' && !approvalRemarks.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const apiCall = approvalAction === 'approve' 
        ? qualityControlAPI.approveQC(qc._id, approvalRemarks)
        : qualityControlAPI.rejectQC(qc._id, approvalRemarks);
      
      const response = await apiCall;
      
      if (response.success) {
        toast.success(`Quality control ${approvalAction}d successfully`);
        setShowApprovalModal(false);
        setApprovalRemarks('');
        await loadQualityControl(qc._id);
      } else {
        toast.error(response.message || `Failed to ${approvalAction} quality control`);
      }
    } catch (error: any) {
      console.error('Error processing approval:', error);
      toast.error(error.message || `Failed to ${approvalAction} quality control`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending_approval':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'partial_pass':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'in_progress':
        return <ClipboardCheck className="w-4 h-4" />;
      case 'pending_approval':
        return <AlertTriangle className="w-4 h-4" />;
      case 'completed':
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

  const formatStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const canSubmit = () => {
    return hasPermission('quality_control', 'submit') && 
           qc && qc.status === 'in_progress' &&
           qc.products.every(p => p.overallStatus !== 'pending' && p.overallStatus !== 'in_progress');
  };

  const canApprove = () => {
    return hasPermission('quality_control', 'approve') && 
           qc && qc.status === 'pending_approval';
  };

  const canEdit = () => {
    return hasPermission('quality_control', 'update') && 
           qc && (qc.status === 'pending' || qc.status === 'in_progress');
  };

  const canSendToWarehouse = () => {
    return hasPermission('warehouse_approval', 'create') && 
           qc && qc.status === 'completed' &&
           qc.products.some(p => p.overallStatus === 'passed' || p.overallStatus === 'partial_pass');
  };

  const sendToWarehouseApproval = async () => {
    if (!qc) return;

    try {
      setSendingToWarehouse(true);
      const response = await warehouseApprovalAPI.createWarehouseApprovalFromQC(qc._id);
      
      if (response.success) {
        toast.success('Successfully sent to warehouse approval');
        navigate(`/warehouse-approval/${response.data._id}`);
      } else {
        toast.error(response.message || 'Failed to send to warehouse approval');
      }
    } catch (error: any) {
      console.error('Error sending to warehouse approval:', error);
      toast.error(error.message || 'Failed to send to warehouse approval');
    } finally {
      setSendingToWarehouse(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!qc) {
    return (
      <div className="text-center py-12">
        <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Quality control record not found</p>
        <button
          onClick={() => navigate('/quality-control')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to Quality Control
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/quality-control')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {qc.qcNumber}
            </h1>
            <div className="flex items-center space-x-4 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getStatusColor(qc.status)
              }`}>
                {getStatusIcon(qc.status)}
                <span className="ml-1">{formatStatusLabel(qc.status)}</span>
              </span>
              
              {qc.overallResult && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  getResultColor(qc.overallResult)
                }`}>
                  <span className="capitalize">{formatStatusLabel(qc.overallResult)}</span>
                </span>
              )}
              
              <span className="text-gray-500 text-sm">
                Created {formatDate(qc.createdAt)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          {canEdit() && (
            <button
              onClick={() => navigate(`/quality-control/${qc._id}/edit`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </button>
          )}
          
          {canSubmit() && (
            <button
              onClick={submitForApproval}
              disabled={submitting}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
          
          {canSendToWarehouse() && (
            <button
              onClick={sendToWarehouseApproval}
              disabled={sendingToWarehouse}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Truck className="w-4 h-4 mr-2" />
              {sendingToWarehouse ? 'Sending...' : 'Send to Warehouse Approval'}
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

      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Invoice Number</label>
            <p className="text-gray-900 font-medium">{qc.invoiceReceiving?.invoiceNumber || 'N/A'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Purchase Order</label>
            {qc.purchaseOrder ? (
              <Link 
                to={`/purchase-orders/${qc.purchaseOrder._id}`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {qc.purchaseOrder.poNumber}
              </Link>
            ) : (
              <p className="text-gray-900">N/A</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">QC Type</label>
            <p className="text-gray-900 capitalize">{qc.qcType}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Priority</label>
            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
              qc.priority === 'urgent' ? 'bg-red-100 text-red-800' :
              qc.priority === 'high' ? 'bg-orange-100 text-orange-800' :
              qc.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {qc.priority.toUpperCase()}
            </span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Assigned To</label>
            <p className="text-gray-900">{qc.assignedTo?.name || 'Unassigned'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Invoice Date</label>
            <p className="text-gray-900">{formatDate(qc.invoiceReceiving.invoiceDate)}</p>
          </div>
        </div>

        {qc.qcEnvironment && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">QC Environment</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {qc.qcEnvironment.temperature && (
                <div>
                  <label className="block text-sm text-gray-500">Temperature</label>
                  <p className="text-gray-900">{qc.qcEnvironment.temperature}°C</p>
                </div>
              )}
              {qc.qcEnvironment.humidity && (
                <div>
                  <label className="block text-sm text-gray-500">Humidity</label>
                  <p className="text-gray-900">{qc.qcEnvironment.humidity}%</p>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-500">Light Condition</label>
                <p className="text-gray-900 capitalize">{qc.qcEnvironment.lightCondition}</p>
              </div>
            </div>
          </div>
        )}
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
              Products ({qc.products.length})
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

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="p-6">
            <div className="space-y-6">
              {qc.products.filter(product => product.receivedQty > 0).map((product, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">{product.productName}</h4>
                      <div className="text-sm text-gray-500 mt-1">
                        Code: {product.productCode} | Batch: {product.batchNo}
                      </div>
                      <div className="text-sm text-gray-500">
                        Received: {product.receivedQty} units
                      </div>
                    </div>
                    
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      getResultColor(product.overallStatus)
                    }`}>
                      <span className="capitalize">{formatStatusLabel(product.overallStatus)}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-green-50 rounded p-3">
                      <div className="text-2xl font-bold text-green-600">{product.passedQty}</div>
                      <div className="text-xs text-gray-600">Passed</div>
                    </div>
                    <div className="bg-red-50 rounded p-3">
                      <div className="text-2xl font-bold text-red-600">{product.failedQty}</div>
                      <div className="text-xs text-gray-600">Failed</div>
                    </div>
                    <div className="bg-yellow-50 rounded p-3">
                      <div className="text-2xl font-bold text-yellow-600">
                        {product.receivedQty - product.passedQty - product.failedQty}
                      </div>
                      <div className="text-xs text-gray-600">Pending</div>
                    </div>
                    <div className="bg-blue-50 rounded p-3">
                      <div className="text-2xl font-bold text-blue-600">
                        {product.passedQty > 0 ? Math.round((product.passedQty / product.receivedQty) * 100) : 0}%
                      </div>
                      <div className="text-xs text-gray-600">Pass Rate</div>
                    </div>
                  </div>

                  {/* QC Summary */}
                  {Object.values(product.qcSummary).some(v => v > 0) && (
                    <div className="border-t border-gray-200 pt-4">
                      <h5 className="font-medium text-gray-900 mb-3">QC Issue Breakdown</h5>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {Object.entries(product.qcSummary).map(([key, value]) => 
                          value > 0 && (
                            <div key={key} className="text-sm">
                              <span className="text-gray-600">{key.replace(/_/g, ' ')}: </span>
                              <span className="font-medium text-gray-900">{value}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {qc.products.filter(p => p.overallStatus === 'passed').length}
                </div>
                <div className="text-sm text-gray-600">Products Passed</div>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">
                  {qc.products.filter(p => p.overallStatus === 'failed').length}
                </div>
                <div className="text-sm text-gray-600">Products Failed</div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {qc.products.filter(p => p.overallStatus === 'partial_pass').length}
                </div>
                <div className="text-sm text-gray-600">Partial Pass</div>
              </div>
            </div>

            {qc.qcRemarks && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">QC Remarks</h4>
                <p className="text-gray-700">{qc.qcRemarks}</p>
              </div>
            )}

            {qc.approvalRemarks && (
              <div className={`rounded-lg p-4 ${
                qc.approvalStatus === 'approved' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <h4 className="font-medium text-gray-900 mb-2">Approval Remarks</h4>
                <p className="text-gray-700">{qc.approvalRemarks}</p>
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
                  <ClipboardCheck className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">QC Record Created</div>
                  <div className="text-sm text-gray-500">{formatDate(qc.createdAt)}</div>
                  {qc.assignedTo && (
                    <div className="text-sm text-gray-500">Assigned to: {qc.assignedTo.name}</div>
                  )}
                </div>
              </div>

              {qc.qcDate && qc.qcBy && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Send className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Submitted for Approval</div>
                    <div className="text-sm text-gray-500">{formatDate(qc.qcDate)}</div>
                    <div className="text-sm text-gray-500">by {qc.qcBy.name}</div>
                  </div>
                </div>
              )}

              {qc.approvalDate && qc.approvedBy && (
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    qc.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {qc.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {qc.status === 'completed' ? 'Approved' : 'Rejected'}
                    </div>
                    <div className="text-sm text-gray-500">{formatDate(qc.approvalDate)}</div>
                    <div className="text-sm text-gray-500">by {qc.approvedBy.name}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Quality Control
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {approvalAction === 'approve' ? 'Approval Comments (Optional)' : 'Rejection Reason (Required)'}
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
                onClick={handleApproval}
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

export default QualityControlDetails;