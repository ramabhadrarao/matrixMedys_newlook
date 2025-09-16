// src/components/InvoiceReceiving/InvoiceReceivingDetails.tsx - COMPLETE UPDATED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Download,
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
  MapPin,
  Phone,
  Mail,
  Truck,
  ClipboardCheck,
  MessageSquare,
  Send
} from 'lucide-react';
import { invoiceReceivingAPI, InvoiceReceiving, QCUpdateData } from '../../services/invoiceReceivingAPI';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const InvoiceReceivingDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, hasPermission } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState<InvoiceReceiving | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [qcModalOpen, setQcModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [submittingQC, setSubmittingQC] = useState(false);
  const [qcData, setQcData] = useState({
    status: 'pending' as 'pending' | 'passed' | 'failed',
    remarks: '',
    qcBy: user?.name || '',
    qcDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (id) {
      loadInvoiceReceiving(id);
    }
  }, [id]);

  const loadInvoiceReceiving = async (receivingId: string) => {
    try {
      setLoading(true);
      const response = await invoiceReceivingAPI.getInvoiceReceiving(receivingId);
      setReceiving(response.data);
    } catch (error: any) {
      toast.error('Failed to load invoice receiving details');
      navigate('/invoice-receiving');
    } finally {
      setLoading(false);
    }
  };

  const handleQCUpdate = async (productIndex: number) => {
    if (!receiving) return;

    try {
      const response = await invoiceReceivingAPI.updateQCStatus(receiving._id, {
        productIndex,
        qcStatus: qcData.status,
        qcRemarks: qcData.remarks,
        qcBy: qcData.qcBy,
        qcDate: qcData.qcDate
      });

      setReceiving(response.data);
      setQcModalOpen(false);
      setSelectedProduct(null);
      setQcData({
        status: 'pending',
        remarks: '',
        qcBy: user?.name || '',
        qcDate: new Date().toISOString().split('T')[0]
      });

      toast.success('QC status updated successfully');
    } catch (error: any) {
      toast.error('Failed to update QC status');
    }
  };

  const handleSubmitToQC = async () => {
    if (!receiving) return;

    try {
      setSubmittingQC(true);
      const response = await invoiceReceivingAPI.submitToQC(receiving._id);
      setReceiving(response.data);
      toast.success('Successfully submitted to QC');
    } catch (error: any) {
      toast.error('Failed to submit to QC');
    } finally {
      setSubmittingQC(false);
    }
  };

  const openQCModal = (product: any, index: number) => {
    setSelectedProduct({ ...product, index });
    setQcData({
      status: product.qcStatus || 'pending',
      remarks: product.qcRemarks || '',
      qcBy: product.qcBy || user?.name || '',
      qcDate: product.qcDate || new Date().toISOString().split('T')[0]
    });
    setQcModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'partial_received':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'qc_pending':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'qc_passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'qc_failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getQCStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    return invoiceReceivingAPI.getStatusBadgeColor(status);
  };

  const getQCStatusColor = (qcStatus: string) => {
    return invoiceReceivingAPI.getQCStatusBadgeColor(qcStatus);
  };

  const formatDate = (date: string) => {
    return invoiceReceivingAPI.formatDate(date);
  };

  const formatCurrency = (amount: number) => {
    return invoiceReceivingAPI.formatCurrency(amount);
  };

  const getStatusLabel = (status: string) => {
    return invoiceReceivingAPI.getStatusLabel(status);
  };

  const getQCStatusLabel = (qcStatus: string) => {
    return invoiceReceivingAPI.getQCStatusLabel(qcStatus);
  };

  const canPerformQC = () => {
    return hasPermission('invoice_receiving', 'qc_check') || user?.role === 'admin';
  };

  const canEdit = () => {
    return hasPermission('invoice_receiving', 'update') || user?.role === 'admin';
  };

  const canSubmitQC = () => {
    return hasPermission('invoice_receiving', 'qc_submit') || user?.role === 'admin';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!receiving) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice receiving not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/invoice-receiving')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice Receiving #{receiving.invoiceNumber}
            </h1>
            <div className="flex items-center space-x-4 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getStatusColor(receiving.status)
              }`}>
                {getStatusIcon(receiving.status)}
                <span className="ml-1">{getStatusLabel(receiving.status)}</span>
              </span>
              
              <span className="text-gray-500 text-sm">
                Received on {formatDate(receiving.receivedDate)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          {canEdit() && (receiving.status === 'draft' || receiving.status === 'submitted') && (
            <Link
              to={`/invoice-receiving/${receiving._id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
          )}

          {canSubmitQC() && receiving.status === 'draft' && receiving.qcRequired && (
            <button
              onClick={handleSubmitToQC}
              disabled={submittingQC}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submittingQC ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {submittingQC ? 'Submitting...' : 'Submit to QC'}
            </button>
          )}
          
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'details', label: 'Details', icon: FileText },
            { id: 'products', label: 'Products', icon: Package },
            { id: 'qc', label: 'Quality Control', icon: ClipboardCheck },
            { id: 'documents', label: 'Documents', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {activeTab === 'details' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Invoice Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Invoice Information
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoice Number:</span>
                    <span className="font-medium">{receiving.invoiceNumber}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoice Date:</span>
                    <span className="font-medium">
                      {receiving.invoiceDate ? formatDate(receiving.invoiceDate) : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoice Amount:</span>
                    <span className="font-medium">
                      {receiving.invoiceAmount ? formatCurrency(receiving.invoiceAmount) : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Received Date:</span>
                    <span className="font-medium">{formatDate(receiving.receivedDate)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Supplier:</span>
                    <span className="font-medium">{receiving.supplier}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">QC Required:</span>
                    <span className="font-medium">
                      {receiving.qcRequired ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Purchase Order Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Purchase Order
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">PO Number:</span>
                    <span className="font-medium">
                      {typeof receiving.purchaseOrder === 'object' 
                        ? receiving.purchaseOrder.poNumber 
                        : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">PO Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      typeof receiving.purchaseOrder === 'object' && receiving.purchaseOrder.status
                        ? getStatusColor(receiving.purchaseOrder.status)
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {typeof receiving.purchaseOrder === 'object' && receiving.purchaseOrder.status
                        ? getStatusLabel(receiving.purchaseOrder.status)
                        : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Products:</span>
                    <span className="font-medium">{receiving.receivedProducts.length}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Received By:</span>
                    <span className="font-medium">{receiving.receivedBy?.name || 'N/A'}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    if (typeof receiving.purchaseOrder === 'object') {
                      navigate(`/purchase-orders/${receiving.purchaseOrder._id}`);
                    }
                  }}
                  className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                  disabled={typeof receiving.purchaseOrder !== 'object'}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Purchase Order
                </button>
              </div>
            </div>
            
            {/* Notes */}
            {receiving.notes && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Notes
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700">{receiving.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Received Products</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordered
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Received
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      QC Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {receiving.receivedProducts.map((product, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{product.productName}</div>
                        <div className="text-sm text-gray-500">Code: {product.productCode}</div>
                        <div className="text-sm text-gray-500">Unit: {product.unit}</div>
                        <div className="text-sm text-gray-500">₹{product.unitPrice}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {product.orderedQuantity}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 font-medium">
                          {product.receivedQuantity}
                        </div>
                        <div className="text-xs text-gray-500">
                          {((product.receivedQuantity / product.orderedQuantity) * 100).toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {product.batchNumber && (
                          <div>Batch: {product.batchNumber}</div>
                        )}
                        {product.expiryDate && (
                          <div>Exp: {formatDate(product.expiryDate)}</div>
                        )}
                        {product.manufacturingDate && (
                          <div>Mfg: {formatDate(product.manufacturingDate)}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          {getQCStatusIcon(product.qcStatus || 'pending')}
                          <span className="text-sm">
                            {getQCStatusLabel(product.qcStatus || 'pending')}
                          </span>
                        </div>
                        {product.qcBy && (
                          <div className="text-xs text-gray-500 mt-1">
                            By: {product.qcBy}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {product.remarks || '-'}
                        {product.qcRemarks && (
                          <div className="text-xs text-gray-500 mt-1">
                            QC: {product.qcRemarks}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'qc' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Quality Control</h3>
              {!receiving.qcRequired && (
                <span className="text-sm text-gray-500">QC not required for this receiving</span>
              )}
            </div>
            
            {receiving.qcRequired ? (
              <div className="space-y-4">
                {receiving.receivedProducts.map((product, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{product.productName}</h4>
                        <div className="text-sm text-gray-500 mt-1">
                          Received: {product.receivedQuantity} {product.unit}
                          {product.batchNumber && ` | Batch: ${product.batchNumber}`}
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-2">
                          {getQCStatusIcon(product.qcStatus || 'pending')}
                          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                            getQCStatusColor(product.qcStatus || 'pending')
                          }`}>
                            {getQCStatusLabel(product.qcStatus || 'pending')}
                          </span>
                        </div>
                        
                        {product.qcRemarks && (
                          <div className="mt-2 text-sm text-gray-600">
                            <strong>QC Remarks:</strong> {product.qcRemarks}
                          </div>
                        )}
                        
                        {product.qcBy && (
                          <div className="mt-1 text-xs text-gray-500">
                            QC by: {product.qcBy} on {product.qcDate ? formatDate(product.qcDate) : 'N/A'}
                          </div>
                        )}
                      </div>
                      
                      {canPerformQC() && (receiving.status === 'submitted' || receiving.status === 'qc_pending') && (
                        <button
                          onClick={() => openQCModal(product, index)}
                          className="ml-4 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          Update QC
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Quality control is not required for this receiving.
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Supporting Documents</h3>
            
            {receiving.documents && receiving.documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {receiving.documents.map((doc, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.originalName || `Document ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={() => doc.url && window.open(doc.url, '_blank')}
                        className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        disabled={!doc.url}
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          if (doc.url) {
                            const link = document.createElement('a');
                            link.href = doc.url;
                            link.download = doc.originalName || `document-${index + 1}`;
                            link.click();
                          }
                        }}
                        className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        disabled={!doc.url}
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No documents uploaded for this receiving.
              </div>
            )}
          </div>
        )}
      </div>

      {/* QC Modal */}
      {qcModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Update QC Status - {selectedProduct.productName}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QC Status
                </label>
                <select
                  value={qcData.status}
                  onChange={(e) => setQcData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QC Remarks
                </label>
                <textarea
                  value={qcData.remarks}
                  onChange={(e) => setQcData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter QC remarks..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QC Date
                </label>
                <input
                  type="date"
                  value={qcData.qcDate}
                  onChange={(e) => setQcData(prev => ({ ...prev, qcDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setQcModalOpen(false);
                  setSelectedProduct(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={() => handleQCUpdate(selectedProduct.index)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Update QC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceReceivingDetails;