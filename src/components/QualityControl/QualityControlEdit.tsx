// src/components/QualityControl/QualityControlEdit.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { qualityControlAPI } from '../../services/qualityControlAPI';
import toast from 'react-hot-toast';

interface QCItemDetail {
  itemNumber: number;
  status: 'pending' | 'passed' | 'failed';
  qcReasons: string[];
  remarks: string;
}

interface QCProduct {
  product: string;
  productCode: string;
  productName: string;
  batchNo: string;
  mfgDate: string;
  expDate: string;
  receivedQty: number;
  itemDetails: QCItemDetail[];
  overallStatus: string;
  passedQty: number;
  failedQty: number;
}

const QC_REASONS = [
  'received_correctly',
  'damaged_packaging',
  'damaged_product',
  'expired',
  'near_expiry',
  'wrong_product',
  'quantity_mismatch',
  'quality_issue',
  'labeling_issue',
  'other'
];

const QualityControlEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qcData, setQcData] = useState<any>(null);
  const [products, setProducts] = useState<QCProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  
  const [itemFormData, setItemFormData] = useState({
    status: 'pending' as 'pending' | 'passed' | 'failed',
    qcReasons: [] as string[],
    remarks: ''
  });

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
        setQcData(response.data);
        setProducts(response.data.products || []);
      } else {
        toast.error('Failed to load quality control');
        navigate('/quality-control');
      }
    } catch (error: any) {
      console.error('Error loading QC:', error);
      toast.error(error.message || 'Failed to load quality control');
      navigate('/quality-control');
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (productIndex: number, itemIndex: number) => {
    setSelectedProduct(productIndex);
    setSelectedItem(itemIndex);
    
    const item = products[productIndex].itemDetails[itemIndex];
    setItemFormData({
      status: item.status,
      qcReasons: item.qcReasons || [],
      remarks: item.remarks || ''
    });
  };

  const handleItemUpdate = async () => {
    if (selectedItem === null || !id) return;

    try {
      setSaving(true);
      const response = await qualityControlAPI.updateItemQC(
        id,
        selectedProduct,
        selectedItem,
        itemFormData
      );
      
      if (response.success) {
        toast.success('Item QC updated successfully');
        
        // Update local state
        const updatedProducts = [...products];
        updatedProducts[selectedProduct].itemDetails[selectedItem] = {
          ...updatedProducts[selectedProduct].itemDetails[selectedItem],
          ...itemFormData
        };
        
        // Update product overall status from response
        if (response.data.product) {
          updatedProducts[selectedProduct].overallStatus = response.data.product.overallStatus;
          updatedProducts[selectedProduct].passedQty = response.data.product.passedQty;
          updatedProducts[selectedProduct].failedQty = response.data.product.failedQty;
        }
        
        setProducts(updatedProducts);
        setSelectedItem(null);
        
        // Reset form
        setItemFormData({
          status: 'pending',
          qcReasons: [],
          remarks: ''
        });
      } else {
        toast.error(response.message || 'Failed to update item QC');
      }
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast.error(error.message || 'Failed to update item QC');
    } finally {
      setSaving(false);
    }
  };

  const handleReasonToggle = (reason: string) => {
    setItemFormData(prev => ({
      ...prev,
      qcReasons: prev.qcReasons.includes(reason)
        ? prev.qcReasons.filter(r => r !== reason)
        : [...prev.qcReasons, reason]
    }));
  };

  const formatReasonLabel = (reason: string) => {
    return reason.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!qcData || products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No products found for quality control</p>
        <button
          onClick={() => navigate('/quality-control')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to Quality Control
        </button>
      </div>
    );
  }

  const currentProduct = products[selectedProduct];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/quality-control/${id}`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Edit QC - {qcData.qcNumber}
            </h1>
            <p className="text-gray-600 mt-1">
              Perform quality control checks for each item
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Products</h3>
            <div className="space-y-2">
              {products.filter(product => product.receivedQty > 0).map((product, index) => {
                // Get the original index for state management
                const originalIndex = products.findIndex(p => p === product);
                return (
                  <button
                    key={originalIndex}
                    onClick={() => {
                      setSelectedProduct(originalIndex);
                      setSelectedItem(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedProduct === originalIndex
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    } border`}
                  >
                    <div className="font-medium text-gray-900 text-sm">
                      {product.productName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {product.productCode} | Batch: {product.batchNo}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs text-green-600">
                        ✓ {product.passedQty}
                      </span>
                      <span className="text-xs text-red-600">
                        ✗ {product.failedQty}
                      </span>
                      <span className="text-xs text-gray-600">
                        ○ {product.receivedQty - product.passedQty - product.failedQty}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Item Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Product Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              {currentProduct.productName}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-500">Product Code</label>
                <p className="font-medium">{currentProduct.productCode}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Batch No</label>
                <p className="font-medium">{currentProduct.batchNo}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Received Qty</label>
                <p className="font-medium">{currentProduct.receivedQty}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                  getStatusColor(currentProduct.overallStatus)
                }`}>
                  {currentProduct.overallStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Item List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Items ({currentProduct.itemDetails.length})
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {currentProduct.itemDetails.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleItemSelect(selectedProduct, index)}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedItem === index
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : item.status === 'passed'
                      ? 'border-green-300 bg-green-50'
                      : item.status === 'failed'
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-medium text-sm">#{item.itemNumber}</div>
                    <div className="mt-1">
                      {item.status === 'passed' && (
                        <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                      )}
                      {item.status === 'failed' && (
                        <XCircle className="w-4 h-4 text-red-600 mx-auto" />
                      )}
                      {item.status === 'pending' && (
                        <div className="w-4 h-4 border-2 border-gray-400 rounded-full mx-auto" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* QC Form */}
          {selectedItem !== null && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                QC Item #{currentProduct.itemDetails[selectedItem].itemNumber}
              </h3>
              
              <div className="space-y-6">
                {/* Status Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    QC Status *
                  </label>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setItemFormData(prev => ({ ...prev, status: 'passed' }))}
                      className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                        itemFormData.status === 'passed'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 hover:border-green-300'
                      }`}
                    >
                      <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                      <div className="text-sm font-medium">Passed</div>
                    </button>
                    
                    <button
                      onClick={() => setItemFormData(prev => ({ ...prev, status: 'failed' }))}
                      className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                        itemFormData.status === 'failed'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-300 hover:border-red-300'
                      }`}
                    >
                      <XCircle className="w-6 h-6 mx-auto mb-1" />
                      <div className="text-sm font-medium">Failed</div>
                    </button>
                  </div>
                </div>

                {/* QC Reasons (only for failed items) */}
                {itemFormData.status === 'failed' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Failure Reasons
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {QC_REASONS.filter(r => r !== 'received_correctly').map((reason) => (
                        <label
                          key={reason}
                          className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={itemFormData.qcReasons.includes(reason)}
                            onChange={() => handleReasonToggle(reason)}
                            className="rounded border-gray-300 mr-2"
                          />
                          <span className="text-sm">{formatReasonLabel(reason)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks
                  </label>
                  <textarea
                    value={itemFormData.remarks}
                    onChange={(e) => setItemFormData(prev => ({ ...prev, remarks: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any additional observations..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setItemFormData({
                        status: 'pending',
                        qcReasons: [],
                        remarks: ''
                      });
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleItemUpdate}
                    disabled={saving || itemFormData.status === 'pending'}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save QC Result'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          {selectedItem === null && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Instructions</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Select an item from the grid above to perform QC</li>
                <li>• Mark each item as Passed or Failed</li>
                <li>• For failed items, select applicable failure reasons</li>
                <li>• Add remarks for any special observations</li>
                <li>• All items must be checked before submission</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QualityControlEdit;