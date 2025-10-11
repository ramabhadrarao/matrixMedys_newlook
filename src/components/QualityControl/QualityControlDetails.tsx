// src/components/QualityControl/QualityControlDetails.tsx
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
  ClipboardCheck,
  MessageSquare,
  Send,
  Save,
  Camera,
  Download
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface QCItem {
  _id: string;
  productId: string;
  productName: string;
  receivedQty: number;
  unit: string;
  batchNumber?: string;
  expiryDate?: string;
  result: 'pending' | 'passed' | 'failed';
  visualInspection: {
    packaging: 'good' | 'damaged' | 'acceptable';
    labeling: 'correct' | 'incorrect' | 'missing';
    appearance: 'normal' | 'abnormal' | 'acceptable';
  };
  quantityCheck: {
    actualQty: number;
    variance: number;
    acceptable: boolean;
  };
  documentationCheck: {
    batchCertificate: boolean;
    testReports: boolean;
    coa: boolean; // Certificate of Analysis
  };
  remarks: string;
  images: Array<{
    filename: string;
    originalName: string;
    uploadedAt: string;
  }>;
  qcBy?: string;
  qcDate?: string;
}

interface QualityControl {
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
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  overallResult: 'pending' | 'passed' | 'failed' | 'partial';
  items: QCItem[];
  qcBy?: {
    name: string;
  };
  approvedBy?: {
    name: string;
  };
  submittedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  generalRemarks: string;
  createdAt: string;
  updatedAt: string;
}

const QualityControlDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, hasPermission } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [qc, setQc] = useState<QualityControl | null>(null);
  const [activeTab, setActiveTab] = useState('items');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalRemarks, setApprovalRemarks] = useState('');

  useEffect(() => {
    if (id) {
      loadQualityControl(id);
    }
  }, [id]);

  const loadQualityControl = async (qcId: string) => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await qualityControlAPI.getById(qcId);
      // setQc(response.data);
      
      // Mock data for now
      setQc(null);
    } catch (error) {
      console.error('Error loading quality control:', error);
      toast.error('Failed to load quality control details');
    } finally {
      setLoading(false);
    }
  };

  const updateQCItem = async (itemId: string, updates: Partial<QCItem>) => {
    if (!qc) return;

    try {
      setSaving(true);
      // TODO: Replace with actual API call
      // await qualityControlAPI.updateItem(qc._id, itemId, updates);
      
      // Update local state
      setQc(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(item => 
            item._id === itemId ? { ...item, ...updates } : item
          )
        };
      });
      
      toast.success('QC item updated successfully');
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating QC item:', error);
      toast.error('Failed to update QC item');
    } finally {
      setSaving(false);
    }
  };

  const submitForApproval = async () => {
    if (!qc) return;

    try {
      setSubmitting(true);
      // TODO: Replace with actual API call
      // await qualityControlAPI.submit(qc._id);
      
      setQc(prev => prev ? { ...prev, status: 'submitted', submittedAt: new Date().toISOString() } : prev);
      toast.success('Quality control submitted for approval');
    } catch (error) {
      console.error('Error submitting QC:', error);
      toast.error('Failed to submit quality control');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproval = async () => {
    if (!qc) return;

    try {
      // TODO: Replace with actual API call
      // await qualityControlAPI.approve(qc._id, {
      //   action: approvalAction,
      //   remarks: approvalRemarks
      // });
      
      setQc(prev => prev ? {
        ...prev,
        status: approvalAction === 'approve' ? 'approved' : 'rejected',
        approvedAt: new Date().toISOString(),
        approvedBy: { name: user?.name || 'Current User' },
        rejectionReason: approvalAction === 'reject' ? approvalRemarks : undefined
      } : prev);
      
      toast.success(`Quality control ${approvalAction}d successfully`);
      setShowApprovalModal(false);
      setApprovalRemarks('');
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error(`Failed to ${approvalAction} quality control`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
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

  const getResultColor = (result: string) => {
    switch (result) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'partial':
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

  const canEdit = () => {
    return hasPermission('quality_control', 'update') && 
           qc && (qc.status === 'pending' || qc.status === 'in_progress');
  };

  const canSubmit = () => {
    return hasPermission('quality_control', 'submit') && 
           qc && qc.status === 'in_progress' &&
           qc.items.every(item => item.result !== 'pending');
  };

  const canApprove = () => {
    return hasPermission('quality_control', 'approve') && 
           qc && qc.status === 'submitted';
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
              Quality Control - QC-{qc._id.slice(-6).toUpperCase()}
            </h1>
            <div className="flex items-center space-x-4 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getStatusColor(qc.status)
              }`}>
                {getStatusIcon(qc.status)}
                <span className="ml-1 capitalize">{qc.status.replace('_', ' ')}</span>
              </span>
              
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getResultColor(qc.overallResult)
              }`}>
                <span className="capitalize">{qc.overallResult}</span>
              </span>
              
              <span className="text-gray-500 text-sm">
                Created {formatDate(qc.createdAt)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
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
            <p className="text-gray-900 font-medium">{qc.invoiceReceiving.invoiceNumber}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Purchase Order</label>
            <Link 
              to={`/purchase-orders/${qc.invoiceReceiving.purchaseOrder._id}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {qc.invoiceReceiving.purchaseOrder.poNumber}
            </Link>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Principal</label>
            <p className="text-gray-900">{qc.invoiceReceiving.purchaseOrder.principal.name}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Warehouse</label>
            <p className="text-gray-900">{qc.invoiceReceiving.warehouse.name}</p>
            <p className="text-sm text-gray-500">{qc.invoiceReceiving.warehouse.location}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Received Date</label>
            <p className="text-gray-900">{formatDate(qc.invoiceReceiving.receivedDate)}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Received By</label>
            <p className="text-gray-900">{qc.invoiceReceiving.receivedBy.name}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('items')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'items'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              QC Items ({qc.items.length})
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

        {/* QC Items Tab */}
        {activeTab === 'items' && (
          <div className="p-6">
            <div className="space-y-6">
              {qc.items.map((item, index) => (
                <div key={item._id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">{item.productName}</h4>
                      <div className="text-sm text-gray-500 mt-1">
                        Received: {item.receivedQty} {item.unit}
                        {item.batchNumber && ` | Batch: ${item.batchNumber}`}
                        {item.expiryDate && ` | Expires: ${formatDate(item.expiryDate)}`}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getResultColor(item.result)
                      }`}>
                        <span className="capitalize">{item.result}</span>
                      </span>
                      
                      {canEdit() && (
                        <button
                          onClick={() => setEditingItem(editingItem === item._id ? null : item._id)}
                          className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          {editingItem === item._id ? 'Cancel' : 'Edit'}
                        </button>
                      )}
                    </div>
                  </div>

                  {editingItem === item._id ? (
                    <QCItemEditForm
                      item={item}
                      onSave={(updates) => updateQCItem(item._id, updates)}
                      onCancel={() => setEditingItem(null)}
                      saving={saving}
                    />
                  ) : (
                    <QCItemDisplay item={item} />
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
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {qc.items.filter(item => item.result === 'passed').length}
                </div>
                <div className="text-sm text-gray-600">Items Passed</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">
                  {qc.items.filter(item => item.result === 'failed').length}
                </div>
                <div className="text-sm text-gray-600">Items Failed</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {qc.items.filter(item => item.result === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Items Pending</div>
              </div>
            </div>

            {qc.generalRemarks && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">General Remarks</h4>
                <p className="text-gray-700">{qc.generalRemarks}</p>
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
                </div>
              </div>

              {qc.submittedAt && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Send className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Submitted for Approval</div>
                    <div className="text-sm text-gray-500">{formatDate(qc.submittedAt)}</div>
                    {qc.qcBy && <div className="text-sm text-gray-500">by {qc.qcBy.name}</div>}
                  </div>
                </div>
              )}

              {qc.approvedAt && (
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    qc.status === 'approved' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {qc.status === 'approved' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {qc.status === 'approved' ? 'Approved' : 'Rejected'}
                    </div>
                    <div className="text-sm text-gray-500">{formatDate(qc.approvedAt)}</div>
                    {qc.approvedBy && <div className="text-sm text-gray-500">by {qc.approvedBy.name}</div>}
                    {qc.rejectionReason && (
                      <div className="text-sm text-red-600 mt-1">Reason: {qc.rejectionReason}</div>
                    )}
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

// QC Item Display Component
const QCItemDisplay: React.FC<{ item: QCItem }> = ({ item }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Visual Inspection */}
      <div>
        <h5 className="font-medium text-gray-900 mb-3">Visual Inspection</h5>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Packaging:</span>
            <span className={`text-sm font-medium ${
              item.visualInspection.packaging === 'good' ? 'text-green-600' :
              item.visualInspection.packaging === 'damaged' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {item.visualInspection.packaging}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Labeling:</span>
            <span className={`text-sm font-medium ${
              item.visualInspection.labeling === 'correct' ? 'text-green-600' : 'text-red-600'
            }`}>
              {item.visualInspection.labeling}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Appearance:</span>
            <span className={`text-sm font-medium ${
              item.visualInspection.appearance === 'normal' ? 'text-green-600' :
              item.visualInspection.appearance === 'abnormal' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {item.visualInspection.appearance}
            </span>
          </div>
        </div>
      </div>

      {/* Quantity Check */}
      <div>
        <h5 className="font-medium text-gray-900 mb-3">Quantity Check</h5>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Actual Qty:</span>
            <span className="text-sm font-medium text-gray-900">{item.quantityCheck.actualQty}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Variance:</span>
            <span className={`text-sm font-medium ${
              item.quantityCheck.variance === 0 ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {item.quantityCheck.variance > 0 ? '+' : ''}{item.quantityCheck.variance}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Acceptable:</span>
            <span className={`text-sm font-medium ${
              item.quantityCheck.acceptable ? 'text-green-600' : 'text-red-600'
            }`}>
              {item.quantityCheck.acceptable ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Documentation Check */}
      <div>
        <h5 className="font-medium text-gray-900 mb-3">Documentation</h5>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Batch Certificate:</span>
            <span className={`text-sm font-medium ${
              item.documentationCheck.batchCertificate ? 'text-green-600' : 'text-red-600'
            }`}>
              {item.documentationCheck.batchCertificate ? 'Available' : 'Missing'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Test Reports:</span>
            <span className={`text-sm font-medium ${
              item.documentationCheck.testReports ? 'text-green-600' : 'text-red-600'
            }`}>
              {item.documentationCheck.testReports ? 'Available' : 'Missing'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">COA:</span>
            <span className={`text-sm font-medium ${
              item.documentationCheck.coa ? 'text-green-600' : 'text-red-600'
            }`}>
              {item.documentationCheck.coa ? 'Available' : 'Missing'}
            </span>
          </div>
        </div>
      </div>

      {/* Remarks and Images */}
      {(item.remarks || item.images.length > 0) && (
        <div className="md:col-span-2 lg:col-span-3">
          {item.remarks && (
            <div className="mb-4">
              <h5 className="font-medium text-gray-900 mb-2">Remarks</h5>
              <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">{item.remarks}</p>
            </div>
          )}
          
          {item.images.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Images ({item.images.length})</h5>
              <div className="grid grid-cols-4 gap-2">
                {item.images.map((image, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={`http://localhost:5000/api/files/public/view/${image.filename}`}
                      alt={`QC Image ${idx + 1}`}
                      className="w-full aspect-square object-cover rounded border"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded flex items-center justify-center">
                      <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// QC Item Edit Form Component
const QCItemEditForm: React.FC<{
  item: QCItem;
  onSave: (updates: Partial<QCItem>) => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ item, onSave, onCancel, saving }) => {
  const [formData, setFormData] = useState({
    result: item.result,
    visualInspection: { ...item.visualInspection },
    quantityCheck: { ...item.quantityCheck },
    documentationCheck: { ...item.documentationCheck },
    remarks: item.remarks
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Result */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">QC Result</label>
        <select
          value={formData.result}
          onChange={(e) => setFormData(prev => ({ ...prev, result: e.target.value as any }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="pending">Pending</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Visual Inspection */}
        <div>
          <h5 className="font-medium text-gray-900 mb-3">Visual Inspection</h5>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Packaging</label>
              <select
                value={formData.visualInspection.packaging}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  visualInspection: { ...prev.visualInspection, packaging: e.target.value as any }
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
                value={formData.visualInspection.labeling}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  visualInspection: { ...prev.visualInspection, labeling: e.target.value as any }
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
                value={formData.visualInspection.appearance}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  visualInspection: { ...prev.visualInspection, appearance: e.target.value as any }
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

        {/* Quantity Check */}
        <div>
          <h5 className="font-medium text-gray-900 mb-3">Quantity Check</h5>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Actual Quantity</label>
              <input
                type="number"
                value={formData.quantityCheck.actualQty}
                onChange={(e) => {
                  const actualQty = parseFloat(e.target.value) || 0;
                  const variance = actualQty - item.receivedQty;
                  setFormData(prev => ({
                    ...prev,
                    quantityCheck: { 
                      ...prev.quantityCheck, 
                      actualQty,
                      variance,
                      acceptable: Math.abs(variance) <= (item.receivedQty * 0.05) // 5% tolerance
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
                value={formData.quantityCheck.variance}
                readOnly
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.quantityCheck.acceptable}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  quantityCheck: { ...prev.quantityCheck, acceptable: e.target.checked }
                }))}
                className="rounded border-gray-300 mr-2"
              />
              <label className="text-sm text-gray-600">Acceptable</label>
            </div>
          </div>
        </div>

        {/* Documentation Check */}
        <div>
          <h5 className="font-medium text-gray-900 mb-3">Documentation</h5>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.documentationCheck.batchCertificate}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  documentationCheck: { ...prev.documentationCheck, batchCertificate: e.target.checked }
                }))}
                className="rounded border-gray-300 mr-2"
              />
              <label className="text-sm text-gray-600">Batch Certificate</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.documentationCheck.testReports}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  documentationCheck: { ...prev.documentationCheck, testReports: e.target.checked }
                }))}
                className="rounded border-gray-300 mr-2"
              />
              <label className="text-sm text-gray-600">Test Reports</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.documentationCheck.coa}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  documentationCheck: { ...prev.documentationCheck, coa: e.target.checked }
                }))}
                className="rounded border-gray-300 mr-2"
              />
              <label className="text-sm text-gray-600">Certificate of Analysis</label>
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

export default QualityControlDetails;